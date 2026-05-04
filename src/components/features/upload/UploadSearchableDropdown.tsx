import type { ComponentProps } from 'react';

import SearchableDropdown from '@/components/common/SearchableDropdown';

export function UploadSearchableDropdown(
  props: Omit<ComponentProps<typeof SearchableDropdown>, 'variant'>,
) {
  return <SearchableDropdown {...props} variant="upload" />;
}
