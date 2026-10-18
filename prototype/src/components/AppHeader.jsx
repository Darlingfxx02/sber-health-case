import {
  GlassButton,
  GlassTabsRoot,
  GlassTabsList,
  GlassTabsTrigger,
  GlassTabsIndicator,
} from "@glass-sdk/liquid-glass";
import { Icon } from "./Icon.jsx";
import { GLASS_PRESETS } from "./Glass.jsx";

function GlassIconButton({ className = "", children, ...props }) {
  return (
    <div className="glass-icon-scene">
      <GlassButton
        {...GLASS_PRESETS.navigation}
        size="icon"
        className={`glass-icon-button ${className}`}
        {...props}
      >
        {children}
      </GlassButton>
    </div>
  );
}

export function AppHeader({ view, onView, disabled }) {
  return (
    <header
      className="app-header app-navigation"
      id="app-header"
      inert={disabled}
    >
      <GlassIconButton
        className="app-menu"
        disabled
        title="Вне сценария тестового"
        aria-label="Открыть чаты"
      >
        <span className="menu-lines" aria-hidden="true">
          <i />
          <i />
        </span>
      </GlassIconButton>
      <div className="glass-switch-scene">
        <GlassTabsRoot value={view} onValueChange={onView}>
          <GlassTabsList
            id="view-switch"
            className="view-switch"
            data-interaction-hint="group"
            aria-label="Режим приложения"
            {...GLASS_PRESETS.navigation}
          >
            <GlassTabsIndicator
              className="glass-selection"
              {...GLASS_PRESETS.selection}
            />
            <GlassTabsTrigger
              id="tab-chat"
              value="chat"
              aria-controls="chat-panel"
            >
              Чат
            </GlassTabsTrigger>
            <GlassTabsTrigger
              id="tab-widgets"
              value="widgets"
              aria-controls="widget-panel"
            >
              Виджеты
            </GlassTabsTrigger>
          </GlassTabsList>
        </GlassTabsRoot>
      </div>
      <GlassIconButton
        className="circle header-circle"
        disabled
        title="Вне сценария тестового"
        id="profile"
        aria-label="Профиль"
      >
        <Icon name="user" />
      </GlassIconButton>
    </header>
  );
}
