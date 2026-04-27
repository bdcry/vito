import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';

import items from 'data/items.json' with { type: 'json' };
import { Item } from 'src/types.ts';
import {
  AuthLoginInSchema,
  AuthRegisterInSchema,
  ItemsGetInQuerySchema,
  ItemUpdateInSchema,
} from 'src/validation.ts';
import { treeifyError, ZodError } from 'zod';
import { doesItemNeedRevision } from './src/utils.ts';

const ITEMS = items as Item[];
const PAGE_SIZE_MAX = 10;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
const OLLAMA_AUTOSTART = process.env.OLLAMA_AUTOSTART !== 'false';
const OLLAMA_AUTO_PULL = process.env.OLLAMA_AUTO_PULL !== 'false';

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
};

const USERS: UserRecord[] = [
  {
    id: 'seed-user-1',
    email: 'seller@vito.ru',
    fullName: 'Тестовый продавец',
    password: '123456',
    phone: '+7 (901) 111-22-33',
    city: 'Москва',
  },
  {
    id: 'seed-user-2',
    email: 'anna@vito.ru',
    fullName: 'Анна Смирнова',
    password: '123456',
    phone: '+7 (902) 333-44-55',
    city: 'Санкт-Петербург',
  },
  {
    id: 'seed-user-3',
    email: 'dmitry@vito.ru',
    fullName: 'Дмитрий Кузнецов',
    password: '123456',
    phone: '+7 (903) 555-66-77',
    city: 'Казань',
  },
];

const TOKEN_TO_USER_ID = new Map<string, string>();
const ITEM_OWNER_BY_ID = new Map<number, string>();

const createFallbackDescription = (item: Item) => {
  if (item.category === 'auto') {
    return `Автомобиль "${item.title}" в рабочем состоянии. Подходит для ежедневных поездок по городу и трассе. Возможен быстрый показ по договоренности.`;
  }

  if (item.category === 'real_estate') {
    return `Объект "${item.title}" с актуальными параметрами в объявлении. Подходит для проживания или инвестиций в зависимости от формата. Показ возможен в удобное время.`;
  }

  return `Товар "${item.title}" в наличии. Подойдет для повседневного использования, состояние и характеристики указаны в карточке. Отвечу на вопросы в сообщениях.`;
};

ITEMS.forEach((item) => {
  if (!item.description?.trim()) {
    item.description = createFallbackDescription(item);
  }
  const ownerIndex = item.id % USERS.length;
  ITEM_OWNER_BY_ID.set(item.id, USERS[ownerIndex].id);
});

const initialItemsSnapshot = [...ITEMS];
const maxExistingId = ITEMS.reduce((maxId, item) => Math.max(maxId, item.id), 0);
const generatedItems: Item[] = initialItemsSnapshot.slice(0, 18).map((item, index) => {
  const id = maxExistingId + index + 1;
  const createdAt = new Date(Date.now() - (index + 2) * 86_400_000).toISOString();

  return {
    ...item,
    id,
    description: `${item.description ?? createFallbackDescription(item)} Тестовая копия объявления.`,
    createdAt,
    updatedAt: createdAt,
  };
});

generatedItems.forEach((item) => {
  ITEMS.push(item);
  const ownerIndex = item.id % USERS.length;
  ITEM_OWNER_BY_ID.set(item.id, USERS[ownerIndex].id);
});

const fastify = Fastify({
  logger: true,
});

let ollamaProcess: ChildProcess | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildParamsText = (params: Record<string, unknown> | undefined) => {
  if (!params) {
    return 'Нет данных';
  }

  const paramsText = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join('\n');

  return paramsText || 'Нет данных';
};

const isOllamaReachable = async () => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
};

const startOllamaProcess = () => {
  if (ollamaProcess) {
    return;
  }

  fastify.log.info('Запускаем локальный процесс Ollama...');

  const processHandle = spawn('ollama', ['serve'], {
    stdio: 'ignore',
  });

  ollamaProcess = processHandle;

  processHandle.on('error', (error) => {
    fastify.log.warn({ error }, 'Не удалось запустить Ollama автоматически');
    if (ollamaProcess === processHandle) {
      ollamaProcess = null;
    }
  });

  processHandle.on('exit', (code, signal) => {
    fastify.log.warn(
      { code, signal },
      'Процесс Ollama завершился. Для AI-функций может потребоваться ручной запуск',
    );

    if (ollamaProcess === processHandle) {
      ollamaProcess = null;
    }
  });
};

const waitForOllama = async () => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await isOllamaReachable()) {
      return true;
    }

    await sleep(400);
  }

  return false;
};

const ensureOllamaModel = async () => {
  if (!OLLAMA_AUTO_PULL) {
    return;
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      fastify.log.warn(
        { status: response.status, errorText },
        'Не удалось автоматически подтянуть модель Ollama',
      );
    }
  } catch (error) {
    fastify.log.warn({ error }, 'Ошибка при автозагрузке модели Ollama');
  }
};

const bootstrapOllama = async () => {
  const alreadyReachable = await isOllamaReachable();

  if (!alreadyReachable && OLLAMA_AUTOSTART) {
    startOllamaProcess();
  }

  const reachableAfterBootstrap = await waitForOllama();

  if (!reachableAfterBootstrap) {
    fastify.log.warn(
      'Ollama недоступна. Запросы к AI-эндпоинтам будут возвращать 502 до запуска сервиса',
    );
    return;
  }

  fastify.log.info('Ollama доступна');
  void ensureOllamaModel();
};

const generateWithOllama = async (prompt: string) => {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
  }

  const body = (await response.json()) as { response?: string };
  return body.response?.trim() ?? '';
};

type TAnalyzeResult = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item !== '');
};

const parseAnalyzeResponse = (rawResponse: string): TAnalyzeResult => {
  const fencedJsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidateFromFence = fencedJsonMatch?.[1]?.trim();
  const candidateFromObject = rawResponse.match(/\{[\s\S]*\}/)?.[0]?.trim();
  const jsonCandidate = candidateFromFence ?? candidateFromObject ?? rawResponse.trim();

  try {
    const parsed = JSON.parse(jsonCandidate) as Partial<TAnalyzeResult>;
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

    return {
      summary: summary || 'AI не вернул краткий итог в ожидаемом формате.',
      strengths: normalizeStringArray(parsed.strengths),
      weaknesses: normalizeStringArray(parsed.weaknesses),
      recommendations: normalizeStringArray(parsed.recommendations),
    };
  } catch {
    return {
      summary: rawResponse.trim() || 'Не удалось получить разбор объявления.',
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };
  }
};

fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    reply.code(204).send();
  }
});

const createAccessToken = (userId: string) => {
  const token = `token-${userId}-${randomUUID()}`;
  TOKEN_TO_USER_ID.set(token, userId);
  return token;
};

const extractUserFromRequest = (request: { headers: { authorization?: string } }) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const userId = TOKEN_TO_USER_ID.get(token);

  if (!userId) {
    return null;
  }

  return USERS.find((user) => user.id === userId) ?? null;
};

const toPublicUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  city: user.city,
});

const toSellerProfile = (user: UserRecord) => ({
  id: user.id,
  name: user.fullName,
  phone: user.phone,
  email: user.email,
  avatarUrl: user.avatarUrl,
  city: user.city,
});

fastify.post('/auth/register', (request, reply) => {
  try {
    const parsedData = AuthRegisterInSchema.parse(request.body);
    const existingUser = USERS.find((user) => user.email.toLowerCase() === parsedData.email.toLowerCase());

    if (existingUser) {
      reply.status(409).send({ success: false, error: 'User with this email already exists' });
      return;
    }

    const createdUser: UserRecord = {
      id: `user-${USERS.length + 1}`,
      email: parsedData.email,
      fullName: parsedData.fullName,
      password: parsedData.password,
    };

    USERS.push(createdUser);

    return {
      accessToken: createAccessToken(createdUser.id),
      user: toPublicUser(createdUser),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, error: treeifyError(error) });
      return;
    }

    throw error;
  }
});

fastify.post('/auth/login', (request, reply) => {
  try {
    const parsedData = AuthLoginInSchema.parse(request.body);
    const user = USERS.find((candidate) => candidate.email.toLowerCase() === parsedData.email.toLowerCase());

    if (!user || user.password !== parsedData.password) {
      reply.status(401).send({ success: false, error: 'Invalid credentials' });
      return;
    }

    return {
      accessToken: createAccessToken(user.id),
      user: toPublicUser(user),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, error: treeifyError(error) });
      return;
    }

    throw error;
  }
});

fastify.get('/user/profile', (request, reply) => {
  const user = extractUserFromRequest(request);

  if (!user) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  return toPublicUser(user);
});

fastify.post('/ai/description', async (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const body = request.body as {
    title?: string;
    category?: string;
    price?: string | number;
    params?: Record<string, unknown>;
    description?: string;
  };
  const taskText = body.description?.trim()
    ? 'Улучши описание этого объявления'
    : 'Сгенерируй описание для этого объявления';

  const prompt = `
    ${taskText} для Авито.

    Ты помогаешь писать тексты для объявлений.
    Пиши по-русски, связно и естественно.
    Сделай 5-7 предложений, 450-700 символов.
    Не выдумывай факты.

    Категория: ${body.category ?? 'Не указано'}
    Название: ${body.title ?? 'Не указано'}
    Цена: ${body.price ?? 'Не указана'}
    Характеристики:
    ${buildParamsText(body.params)}

    Текущее описание:
    ${body.description?.trim() || 'Описание отсутствует'}
  `.trim();

  try {
    const aiResponse = await generateWithOllama(prompt);
    return { response: aiResponse };
  } catch (error) {
    fastify.log.warn({ error }, 'Ошибка запроса к Ollama (description)');
    reply.status(502).send({ success: false, error: 'AI service is unavailable' });
  }
});

fastify.post('/ai/price', async (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const body = request.body as {
    title?: string;
    category?: string;
    price?: string | number;
    params?: Record<string, unknown>;
  };

  const prompt = `
    Ты помогаешь оценить ориентировочную рыночную стоимость объявления для маркетплейса.

    Важно:
    - не проверяй, существует ли модель в реальности;
    - не отказывайся от оценки, даже если название выглядит необычным, новым или вымышленным;
    - не возвращай цену 0, если товар в принципе не является бесплатным;
    - если данных мало, всё равно предложи реалистичную ориентировочную цену;
    - опирайся на категорию, название, характеристики и текущую цену как на слабый ориентир;
    - если модель спорная, оцени цену по классу товара, уровню бренда и заявленным характеристикам.

    Цена должна быть в рублях.

    Верни ответ строго в таком формате:

    Предполагаемая цена: <целое число с пробелами и знаком ₽>
    Краткий комментарий на 3-5 строк:
    - какой это сегмент товара;
    - что сильнее всего влияет на цену;
    - почему выбран именно такой ориентир;
    - если данных мало, укажи это, но всё равно дай цену.

    Данные объявления:
    Категория: ${body.category ?? 'Не указано'}
    Название: ${body.title ?? 'Не указано'}
    Текущая цена: ${body.price ?? 'Не указана'}
    Характеристики:
    ${buildParamsText(body.params)}
  `.trim();

  try {
    const aiResponse = await generateWithOllama(prompt);
    return { response: aiResponse };
  } catch (error) {
    fastify.log.warn({ error }, 'Ошибка запроса к Ollama (price)');
    reply.status(502).send({ success: false, error: 'AI service is unavailable' });
  }
});

fastify.post('/ai/analyze', async (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const body = request.body as {
    title?: string;
    category?: string;
    price?: string | number;
    description?: string;
    params?: Record<string, unknown>;
  };

  const prompt = `
    Проведи анализ качества объявления для маркетплейса и верни ответ строго в JSON.

    Формат JSON:
    {
      "summary": "краткий итог в 1-2 предложениях",
      "strengths": ["сильная сторона 1", "сильная сторона 2"],
      "weaknesses": ["слабая сторона 1", "слабая сторона 2"],
      "recommendations": ["рекомендация 1", "рекомендация 2"]
    }

    Требования:
    - Пиши на русском.
    - Не добавляй markdown, комментарии или текст вне JSON.
    - В каждом массиве 2-4 коротких пункта.
    - Учитывай контекст категории и параметры.
    - Не выдумывай факты, которых нет в объявлении.

    Данные объявления:
    Категория: ${body.category ?? 'Не указано'}
    Название: ${body.title ?? 'Не указано'}
    Цена: ${body.price ?? 'Не указана'}
    Описание: ${body.description?.trim() || 'Не указано'}
    Характеристики:
    ${buildParamsText(body.params)}
  `.trim();

  try {
    const aiResponse = await generateWithOllama(prompt);
    return parseAnalyzeResponse(aiResponse);
  } catch (error) {
    fastify.log.warn({ error }, 'Ошибка запроса к Ollama (analyze)');
    reply.status(502).send({ success: false, error: 'AI service is unavailable' });
  }
});

interface ItemGetRequest extends Fastify.RequestGenericInterface {
  Params: {
    id: string;
  };
}

fastify.get<ItemGetRequest>('/items/:id', (request, reply) => {
  const currentUser = extractUserFromRequest(request);
  const itemId = Number(request.params.id);

  if (!Number.isFinite(itemId)) {
    reply
      .status(400)
      .send({ success: false, error: 'Item ID path param should be a number' });
    return;
  }

  const item = ITEMS.find(item => item.id === itemId);

  if (!item) {
    reply
      .status(404)
      .send({ success: false, error: "Item with requested id doesn't exist" });
    return;
  }

  return {
    ...item,
    ownerId: ITEM_OWNER_BY_ID.get(item.id),
    isMine: currentUser ? ITEM_OWNER_BY_ID.get(item.id) === currentUser.id : false,
    seller: (() => {
      const ownerId = ITEM_OWNER_BY_ID.get(item.id);
      const owner = ownerId ? USERS.find((user) => user.id === ownerId) : undefined;
      return owner ? toSellerProfile(owner) : undefined;
    })(),
    needsRevision: doesItemNeedRevision(item),
  };
});

interface ItemsGetRequest extends Fastify.RequestGenericInterface {
  Querystring: {
    q?: string;
    limit?: string;
    skip?: string;
    categories?: string;
    needsRevision?: string;
    mine?: string;
  };
}

fastify.get<ItemsGetRequest>('/items', (request, reply) => {
  const {
    q,
    limit,
    skip,
    needsRevision,
    categories,
    mine,
    sortColumn,
    sortDirection,
  } = ItemsGetInQuerySchema.parse(request.query);
  const normalizedLimit = Math.min(limit, PAGE_SIZE_MAX);
  const currentUser = extractUserFromRequest(request);

  if (mine && !currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const filteredItems = ITEMS.filter(item => {
    const itemOwnerId = ITEM_OWNER_BY_ID.get(item.id);

    return (
      (!mine || itemOwnerId === currentUser?.id) &&
      item.title.toLowerCase().includes(q.toLowerCase()) &&
      (!needsRevision || doesItemNeedRevision(item)) &&
      (!categories?.length ||
        categories.some(category => item.category === category))
    );
  });

  return {
    items: filteredItems
      .toSorted((item1, item2) => {
        let comparisonValue = 0;

        if (!sortDirection) return comparisonValue;

        if (sortColumn === 'title') {
          comparisonValue = item1.title.localeCompare(item2.title);
        } else if (sortColumn === 'createdAt') {
          comparisonValue =
            new Date(item1.createdAt).valueOf() -
            new Date(item2.createdAt).valueOf();
        }

        return (sortDirection === 'desc' ? -1 : 1) * comparisonValue;
      })
      .slice(skip, skip + normalizedLimit)
      .map(item => ({
        id: item.id,
        category: item.category,
        title: item.title,
        price: item.price,
        description: item.description,
        ownerId: ITEM_OWNER_BY_ID.get(item.id),
        isMine: currentUser ? ITEM_OWNER_BY_ID.get(item.id) === currentUser.id : false,
        needsRevision: doesItemNeedRevision(item),
      })),
    total: filteredItems.length,
  };
});

interface ItemUpdateRequest extends Fastify.RequestGenericInterface {
  Params: {
    id: string;
  };
}

fastify.put<ItemUpdateRequest>('/items/:id', (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const itemId = Number(request.params.id);

  if (!Number.isFinite(itemId)) {
    reply
      .status(400)
      .send({ success: false, error: 'Item ID path param should be a number' });
    return;
  }

  const itemIndex = ITEMS.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    reply
      .status(404)
      .send({ success: false, error: "Item with requested id doesn't exist" });
    return;
  }

  if (ITEM_OWNER_BY_ID.get(itemId) !== currentUser.id) {
    reply.status(403).send({ success: false, error: 'Forbidden' });
    return;
  }

  try {
    const parsedData = ItemUpdateInSchema.parse({
      category: ITEMS[itemIndex].category,
      ...(request.body as {}),
    });

    ITEMS[itemIndex] = {
      id: ITEMS[itemIndex].id,
      createdAt: ITEMS[itemIndex].createdAt,
      updatedAt: new Date().toISOString(),
      ...parsedData,
    };

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, error: treeifyError(error) });
      return;
    }

    throw error;
  }
});

fastify.post('/ads', (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const parsedData = ItemUpdateInSchema.parse(request.body);
    const nextId = ITEMS.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    const now = new Date().toISOString();
    const createdItem: Item = {
      id: nextId,
      createdAt: now,
      updatedAt: now,
      ...parsedData,
    };

    ITEMS.push(createdItem);
    ITEM_OWNER_BY_ID.set(createdItem.id, currentUser.id);

    return {
      item: {
        ...createdItem,
        needsRevision: doesItemNeedRevision(createdItem),
      },
    };
  } catch (error) {
    if (error instanceof ZodError) {
      reply.status(400).send({ success: false, error: treeifyError(error) });
      return;
    }

    throw error;
  }
});

interface AdDeleteRequest extends Fastify.RequestGenericInterface {
  Params: {
    id: string;
  };
}

fastify.delete<AdDeleteRequest>('/ads/:id', (request, reply) => {
  const currentUser = extractUserFromRequest(request);

  if (!currentUser) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  const itemId = Number(request.params.id);

  if (!Number.isFinite(itemId)) {
    reply.status(400).send({ success: false, error: 'Item ID path param should be a number' });
    return;
  }

  const itemIndex = ITEMS.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    reply.status(404).send({ success: false, error: "Item with requested id doesn't exist" });
    return;
  }

  if (ITEM_OWNER_BY_ID.get(itemId) !== currentUser.id) {
    reply.status(403).send({ success: false, error: 'Forbidden' });
    return;
  }

  ITEMS.splice(itemIndex, 1);
  ITEM_OWNER_BY_ID.delete(itemId);

  return { success: true, message: 'Объявление удалено' };
});

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST || '0.0.0.0';
void bootstrapOllama();

fastify.listen({ port, host }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  fastify.log.debug(`Server is listening on port ${port}`);
});
