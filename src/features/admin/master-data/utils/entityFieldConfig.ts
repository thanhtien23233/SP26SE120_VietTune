import type { EntityKind } from '../types/masterDataTypes';

export type FieldType = 'text' | 'textarea' | 'select';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
}

export interface EntityConfig {
  kind: EntityKind;
  title: string;
  singularName: string;
  fields: FieldConfig[];
}

export const entityConfigs: Record<EntityKind, EntityConfig> = {
  instruments: {
    kind: 'instruments',
    title: 'Nhạc cụ',
    singularName: 'nhạc cụ',
    fields: [
      { name: 'name', label: 'Tên nhạc cụ', type: 'text', required: true, maxLength: 200 },
      { name: 'category', label: 'Phân loại', type: 'text', maxLength: 100 },
      { name: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 },
      { name: 'tuningSystem', label: 'Hệ thống lên dây', type: 'text', maxLength: 200 },
      { name: 'constructionMethod', label: 'Phương pháp chế tác', type: 'text', maxLength: 200 },
      { name: 'originEthnicGroupId', label: 'Dân tộc gốc (ID)', type: 'text' }, // Later: Change to select dropdown fetching ethnicities
    ],
  },
  ethnicities: {
    kind: 'ethnicities',
    title: 'Dân tộc',
    singularName: 'dân tộc',
    fields: [
      { name: 'name', label: 'Tên dân tộc', type: 'text', required: true, maxLength: 200 },
      { name: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 },
      { name: 'languageFamily', label: 'Hệ ngôn ngữ', type: 'text', maxLength: 200 },
      { name: 'primaryRegion', label: 'Khu vực chính', type: 'text', maxLength: 200 },
    ],
  },
  rituals: {
    kind: 'rituals',
    title: 'Nghi lễ / Sự kiện',
    singularName: 'nghi lễ',
    fields: [
      { name: 'name', label: 'Tên nghi lễ', type: 'text', required: true, maxLength: 200 },
      { name: 'type', label: 'Loại hình', type: 'text', maxLength: 100 },
      { name: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 },
      { name: 'season', label: 'Mùa vụ', type: 'text', maxLength: 200 },
    ],
  },
  vocalStyles: {
    kind: 'vocalStyles',
    title: 'Lối hát',
    singularName: 'lối hát',
    fields: [
      { name: 'name', label: 'Tên lối hát', type: 'text', required: true, maxLength: 200 },
      { name: 'description', label: 'Mô tả', type: 'textarea', maxLength: 1000 },
      { name: 'ethnicGroupId', label: 'Dân tộc (ID)', type: 'text' }, // Later: Change to select dropdown fetching ethnicities
    ],
  },
};
