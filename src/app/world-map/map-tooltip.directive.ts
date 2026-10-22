import { Directive, inject, TemplateRef } from '@angular/core';
import { MapTooltipContext } from './world-map.types';

/**
 * Marks a projected template as the map tooltip and types its context:
 * `<ng-template appMapTooltip let-code let-name="name">`.
 */
@Directive({ selector: 'ng-template[appMapTooltip]' })
export class MapTooltipDirective {
  readonly template = inject<TemplateRef<MapTooltipContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: MapTooltipDirective, ctx: unknown): ctx is MapTooltipContext {
    return true;
  }
}
