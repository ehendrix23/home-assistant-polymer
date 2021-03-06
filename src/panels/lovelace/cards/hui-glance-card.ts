import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap.js";
import { repeat } from "lit-html/directives/repeat";

import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import processConfigEntities from "../common/process-config-entities";

import toggleEntity from "../common/entity/toggle-entity.js";

import "../../../components/entity/state-badge.js";
import "../../../components/ha-card.js";
import "../../../components/ha-icon.js";

import { fireEvent } from "../../../common/dom/fire_event.js";
import { HassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { LovelaceCard, LovelaceConfig } from "../types.js";

interface EntityConfig {
  name: string;
  icon: string;
  entity: string;
  tap_action: "toggle" | "call-service" | "more-info";
  service?: string;
  service_data?: object;
}

interface Config extends LovelaceConfig {
  show_name?: boolean;
  show_state?: boolean;
  title?: string;
  column_width?: string;
  theming?: "primary";
  entities: EntityConfig[];
}

class HuiGlanceCard extends HassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  static get properties(): PropertyDeclarations {
    return {
      hass: {},
    };
  }
  protected hass: HomeAssistant;
  protected config: Config;
  protected configEntities: EntityConfig[];

  public getCardSize() {
    return 3;
  }

  public setConfig(config: Config) {
    this.config = config;
    this.style.setProperty(
      "--glance-column-width",
      config.column_width || "20%"
    );

    if (config.theming) {
      if (typeof config.theming !== "string") {
        throw new Error("Incorrect theming config.");
      }
      this.classList.add(`theme-${config.theming}`);
    }

    this.configEntities = processConfigEntities(config.entities);
    if (this.hass) {
      this.requestUpdate();
    }
  }

  protected render() {
    if (!this.config) {
      return html``;
    }
    const { title } = this.config;
    const states = this.hass.states;
    const entities = this.configEntities.filter(
      (conf) => conf.entity in states
    );

    return html`
      ${this.renderStyle()}
      <ha-card .header="${title}">
        <div class="entities ${classMap({ "no-header": !title })}">
          ${repeat<EntityConfig>(
            entities,
            (entityConf) => entityConf.entity,
            (entityConf) => this.renderEntity(entityConf)
          )}
        </div>
      </ha-card>
    `;
  }

  private renderStyle() {
    return html`
      <style>
        :host(.theme-primary) {
          --paper-card-background-color:var(--primary-color);
          --paper-item-icon-color:var(--text-primary-color);
          color:var(--text-primary-color);
        }
        .entities {
          display: flex;
          padding: 0 16px 4px;
          flex-wrap: wrap;
        }
        .entities.no-header {
          padding-top: 16px;
        }
        .entity {
          box-sizing: border-box;
          padding: 0 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          margin-bottom: 12px;
          width: var(--glance-column-width, 20%);
        }
        .entity div {
          width: 100%;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .name {
          min-height: var(--paper-font-body1_-_line-height, 20px);
        }
        state-badge {
          margin: 8px 0;
        }
      </style>
    `;
  }

  private renderEntity(entityConf) {
    const stateObj = this.hass.states[entityConf.entity];

    return html`
      <div
        class="entity"
        .entityConf="${entityConf}"
        @click="${this.handleClick}"
      >
        ${
          this.config.show_name !== false
            ? html`<div class="name">${
                "name" in entityConf
                  ? entityConf.name
                  : computeStateName(stateObj)
              }</div>`
            : ""
        }
        <state-badge
          .stateObj="${stateObj}"
          .overrideIcon="${entityConf.icon}"
        ></state-badge>
        ${
          this.config.show_state !== false
            ? html`<div>${computeStateDisplay(this.localize, stateObj)}</div>`
            : ""
        }
      </div>
    `;
  }

  private handleClick(ev: MouseEvent) {
    const config = (ev.currentTarget as any).entityConf as EntityConfig;
    const entityId = config.entity;
    switch (config.tap_action) {
      case "toggle":
        toggleEntity(this.hass, entityId);
        break;
      case "call-service": {
        const [domain, service] = config.service.split(".", 2);
        const serviceData = { entity_id: entityId, ...config.service_data };
        this.hass.callService(domain, service, serviceData);
        break;
      }
      default:
        fireEvent(this, "hass-more-info", { entityId });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-glance-card": HuiGlanceCard;
  }
}

customElements.define("hui-glance-card", HuiGlanceCard);
