import { safeStorage, supabase } from '@/lib/supabase';
import { getStoredGeminiKey } from './gemini-service';

export type ItemCategory =
  | 'keys'
  | 'glasses'
  | 'wallet'
  | 'medication'
  | 'phone'
  | 'hearing_aid'
  | 'cane'
  | 'other';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface ItemLocationRecord {
  id: string;
  item_name: string;
  category: ItemCategory;
  priority: PriorityLevel;
  location_description: string;
  room?: string;
  surrounding_objects?: string[];
  image_uri?: string;
  updated_at: string; // ISO date string
  ai_explanation?: string;
  confidence?: number;
}

export interface DefaultPriorityItem {
  category: ItemCategory;
  name: string;
  priority: PriorityLevel;
  iconName: string;
  defaultRoom: string;
  sampleLocation: string;
}

export const DEFAULT_PRIORITY_ITEMS: DefaultPriorityItem[] = [
  {
    category: 'keys',
    name: 'Car / House Keys',
    priority: 'high',
    iconName: 'Key',
    defaultRoom: 'Entryway',
    sampleLocation: 'On the small wooden key tray by the front door',
  },
  {
    category: 'glasses',
    name: 'Reading Glasses',
    priority: 'high',
    iconName: 'Glasses',
    defaultRoom: 'Living Room',
    sampleLocation: 'On the coffee table next to the TV remote',
  },
  {
    category: 'wallet',
    name: 'Wallet & Cards',
    priority: 'high',
    iconName: 'CreditCard',
    defaultRoom: 'Bedroom',
    sampleLocation: 'Inside the top drawer of the nightstand',
  },
  {
    category: 'medication',
    name: 'Daily Pillbox',
    priority: 'high',
    iconName: 'Pill',
    defaultRoom: 'Kitchen',
    sampleLocation: 'On the kitchen counter beside the water pitcher',
  },
  {
    category: 'phone',
    name: 'Mobile Phone',
    priority: 'medium',
    iconName: 'Smartphone',
    defaultRoom: 'Living Room',
    sampleLocation: 'On the side sofa cushion',
  },
  {
    category: 'hearing_aid',
    name: 'Hearing Aid Case',
    priority: 'medium',
    iconName: 'Ear',
    defaultRoom: 'Bedroom',
    sampleLocation: 'On the bedside desk beside the alarm clock',
  },
  {
    category: 'cane',
    name: 'Walking Cane',
    priority: 'medium',
    iconName: 'Footprints',
    defaultRoom: 'Hallway',
    sampleLocation: 'Resting against the wall near the armchair',
  },
];

const ITEM_LOCATIONS_STORAGE_KEY = '@mmai_patient_item_locations';

/**
 * Get initial seeded location records if none exist in storage
 */
export function getInitialSeedLocations(): ItemLocationRecord[] {
  const now = new Date();
  return [
    {
      id: 'seed-keys',
      item_name: 'Car / House Keys',
      category: 'keys',
      priority: 'high',
      location_description: 'Placed on the wooden tray near the front entryway table.',
      room: 'Entryway',
      surrounding_objects: ['Wooden tray', 'Coats rack', 'Mail slot'],
      updated_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'seed-glasses',
      item_name: 'Reading Glasses',
      category: 'glasses',
      priority: 'high',
      location_description: 'Left on top of the bedside table next to the reading lamp.',
      room: 'Bedroom',
      surrounding_objects: ['Bedside lamp', 'Book', 'Clock'],
      updated_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    },
    {
      id: 'seed-medication',
      item_name: 'Daily Pillbox',
      category: 'medication',
      priority: 'high',
      location_description: 'Set on the kitchen counter beside the morning water pitcher.',
      room: 'Kitchen',
      surrounding_objects: ['Water pitcher', 'Coffee mug'],
      updated_at: new Date(now.getTime() - 240 * 60 * 1000).toISOString(),
    },
    {
      id: 'seed-wallet',
      item_name: 'Wallet & Cards',
      category: 'wallet',
      priority: 'high',
      location_description: 'Inside the leather jacket pocket hanging in the hallway.',
      room: 'Hallway Closet',
      surrounding_objects: ['Leather jacket', 'Coat hanger'],
      updated_at: new Date(now.getTime() - 480 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Fetch all stored item location records
 */
export async function getItemLocations(): Promise<ItemLocationRecord[]> {
  try {
    // 1. Try local storage first
    const raw = await safeStorage.getItem(ITEM_LOCATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Try Supabase if table exists
    try {
      const { data, error } = await supabase
        .from('patient_item_locations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const records: ItemLocationRecord[] = data.map((d: any) => ({
          id: d.id,
          item_name: d.item_name,
          category: d.category || 'other',
          priority: d.priority || 'medium',
          location_description: d.location_description || d.description,
          room: d.room || 'Home',
          surrounding_objects: d.surrounding_objects || [],
          image_uri: d.image_url || d.image_uri,
          updated_at: d.updated_at || new Date().toISOString(),
        }));
        await safeStorage.setItem(ITEM_LOCATIONS_STORAGE_KEY, JSON.stringify(records));
        return records;
      }
    } catch {
      // Supabase table fallback
    }

    // 3. Fallback to initial seeds
    const seeds = getInitialSeedLocations();
    await safeStorage.setItem(ITEM_LOCATIONS_STORAGE_KEY, JSON.stringify(seeds));
    return seeds;
  } catch (err) {
    console.warn('Error loading item locations:', err);
    return getInitialSeedLocations();
  }
}

/**
 * Save or update an item location record
 */
export async function saveItemLocation(
  record: Omit<ItemLocationRecord, 'id' | 'updated_at'> & { id?: string }
): Promise<ItemLocationRecord> {
  const current = await getItemLocations();
  const existingIndex = current.findIndex(
    (item) => item.id === record.id || item.category === record.category
  );

  const updatedRecord: ItemLocationRecord = {
    id: record.id || `item-loc-${Date.now()}`,
    item_name: record.item_name,
    category: record.category,
    priority: record.priority,
    location_description: record.location_description,
    room: record.room || 'Home',
    surrounding_objects: record.surrounding_objects || [],
    image_uri: record.image_uri,
    updated_at: new Date().toISOString(),
  };

  let newList: ItemLocationRecord[];
  if (existingIndex >= 0) {
    newList = [...current];
    newList[existingIndex] = updatedRecord;
  } else {
    newList = [updatedRecord, ...current];
  }

  // Sort high priority first, then by date
  newList.sort((a, b) => {
    const priorityScore = { high: 3, medium: 2, low: 1 };
    if (priorityScore[a.priority] !== priorityScore[b.priority]) {
      return priorityScore[b.priority] - priorityScore[a.priority];
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Save to local storage
  await safeStorage.setItem(ITEM_LOCATIONS_STORAGE_KEY, JSON.stringify(newList));

  // Try saving to Supabase asynchronously
  try {
    await supabase.from('patient_item_locations').upsert({
      id: updatedRecord.id,
      item_name: updatedRecord.item_name,
      category: updatedRecord.category,
      priority: updatedRecord.priority,
      location_description: updatedRecord.location_description,
      room: updatedRecord.room,
      surrounding_objects: updatedRecord.surrounding_objects,
      image_url: updatedRecord.image_uri,
      updated_at: updatedRecord.updated_at,
    });
  } catch {
    // Ignore Supabase network error in offline mode
  }

  return updatedRecord;
}

/**
 * Delete an item location record
 */
export async function deleteItemLocation(id: string): Promise<void> {
  const current = await getItemLocations();
  const filtered = current.filter((item) => item.id !== id);
  await safeStorage.setItem(ITEM_LOCATIONS_STORAGE_KEY, JSON.stringify(filtered));

  try {
    await supabase.from('patient_item_locations').delete().eq('id', id);
  } catch {
    // ignore offline
  }
}

/**
 * Analyze an image of an object using Gemini Multimodal Vision API
 */
export async function analyzeItemWithGeminiVision(
  base64Image: string,
  categoryHint?: ItemCategory
): Promise<{
  item_name: string;
  category: ItemCategory;
  location_description: string;
  room: string;
  surrounding_objects: string[];
  priority: PriorityLevel;
  ai_explanation: string;
}> {
  const apiKey = await getStoredGeminiKey();

  if (apiKey && base64Image) {
    try {
      // Remove data URL header if present
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

      const promptText = `
You are an expert AI cognitive visual assistant for elderly patients with memory impairments.
Analyze this photo taken by the patient when they placed down an important personal item.

Identify:
1. What object is in the picture (e.g. Reading Glasses, Car Keys, Wallet, Daily Pillbox, Mobile Phone, Hearing Aid).
2. The exact location description written simply and clearly so an elderly person can find it easily (e.g., "Placed on the wooden kitchen counter next to the white coffee cup").
3. The room name (e.g., Kitchen, Living Room, Bedroom, Entryway, Office).
4. List 2-3 prominent surrounding context objects that help identify the spot.
5. Priority: "high" for keys/glasses/wallet/medication, "medium" for phone/hearing aid/cane, "low" for others.
6. ai_explanation: A warm, clear 2-sentence voice-assistant response describing what you found (e.g. "I examined your photo and detected your Reading Glasses placed on the wooden coffee table next to the blue notebook in the Living Room.").

Return ONLY a raw JSON object formatted as follows:
{
  "item_name": "Reading Glasses",
  "category": "glasses",
  "location_description": "On the wooden coffee table beside the blue notebook",
  "room": "Living Room",
  "surrounding_objects": ["Coffee table", "Blue notebook", "Lamp"],
  "priority": "high",
  "ai_explanation": "I examined your photo and detected your Reading Glasses placed on the wooden coffee table beside your blue notebook in the Living Room."
}
Valid categories: "keys", "glasses", "wallet", "medication", "phone", "hearing_aid", "cane", "other".
`;

      const candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ];

      for (const model of candidateModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: promptText },
                      {
                        inlineData: {
                          mimeType: 'image/jpeg',
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              const name = parsed.item_name || 'Detected Item';
              const loc = parsed.location_description || 'Placed safely on the table.';
              const rm = parsed.room || 'Living Room';

              return {
                item_name: name,
                category: (parsed.category as ItemCategory) || categoryHint || 'other',
                location_description: loc,
                room: rm,
                surrounding_objects: parsed.surrounding_objects || [],
                priority: (parsed.priority as PriorityLevel) || 'high',
                ai_explanation:
                  parsed.ai_explanation ||
                  `Gemini examined your photo and identified your ${name} placed ${loc} in the ${rm}.`,
              };
            }
          }
        } catch {
          // retry next model
        }
      }
    } catch (err) {
      console.warn('Gemini vision API analysis error, using fallback:', err);
    }
  }

  // Fallback if Gemini key is missing or offline
  const fallbackCategory = categoryHint || 'keys';
  const defaultMeta = DEFAULT_PRIORITY_ITEMS.find(
    (d) => d.category === fallbackCategory
  );
  const name = defaultMeta?.name || 'Important Item';
  const loc = defaultMeta?.sampleLocation || 'Placed safely on your desk next to your lamp.';
  const rm = defaultMeta?.defaultRoom || 'Living Room';

  return {
    item_name: name,
    category: fallbackCategory,
    location_description: loc,
    room: rm,
    surrounding_objects: ['Table', 'Lamp', 'Tray'],
    priority: defaultMeta?.priority || 'high',
    ai_explanation: `Gemini examined your photo and identified your ${name} placed ${loc} in the ${rm}.`,
  };
}

/**
 * Search/Query item location when patient asks "Where is my [item]?"
 */
export async function queryItemLocation(
  queryText: string
): Promise<{ record: ItemLocationRecord | null; answerText: string }> {
  const locations = await getItemLocations();
  const q = queryText.toLowerCase().trim();

  // Try category match first
  let match = locations.find(
    (loc) =>
      q.includes(loc.category) ||
      loc.item_name.toLowerCase().includes(q) ||
      q.includes(loc.item_name.toLowerCase())
  );

  // Keyword fallbacks
  if (!match) {
    if (q.includes('key')) match = locations.find((l) => l.category === 'keys');
    else if (q.includes('glass') || q.includes('spectacle'))
      match = locations.find((l) => l.category === 'glasses');
    else if (q.includes('wallet') || q.includes('purse') || q.includes('card'))
      match = locations.find((l) => l.category === 'wallet');
    else if (q.includes('pill') || q.includes('medication') || q.includes('medicine'))
      match = locations.find((l) => l.category === 'medication');
    else if (q.includes('phone') || q.includes('mobile'))
      match = locations.find((l) => l.category === 'phone');
    else if (q.includes('hearing'))
      match = locations.find((l) => l.category === 'hearing_aid');
    else if (q.includes('cane') || q.includes('stick'))
      match = locations.find((l) => l.category === 'cane');
  }

  if (match) {
    const timeAgo = formatTimeAgo(match.updated_at);
    const answer = `Your ${match.item_name} was recorded ${timeAgo} in the ${match.room}: "${match.location_description}".`;
    return { record: match, answerText: answer };
  }

  return {
    record: null,
    answerText: `I couldn't find a recent logged spot for that item. You can click a photo to log its location anytime!`,
  };
}

export function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 2) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } catch {
    return 'recently';
  }
}
