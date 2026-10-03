// ==============================================================================
// MANVIA — Public Route Decorator
// ==============================================================================
// Phase 4: Allows endpoints to opt out of global authentication requirement
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
