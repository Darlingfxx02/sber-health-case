import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { GlassScene, GlassContent } from "@glass-sdk/liquid-glass";
import { useGlassDiagnostics } from "./components/Glass.jsx";
import { AppHeader } from "./components/AppHeader.jsx";
import { ChatView, Composer } from "./components/Chat.jsx";
import { Widgets } from "./components/Widgets.jsx";
import { PulseDetails } from "./components/PulseDetails.jsx";
import { readStartView } from "./preferences.js";
import { useHistoryDrawer } from "./hooks/useHistoryDrawer.js";
import { RESULTS, ACTIVITY_DAYS, metricsForDay } from "./data.js";
import { useCaseBridge } from "./hooks/useCaseBridge.js";
import { canOpenDetail } from "./case-scope.js";
import { usePulseNavigation } from "./hooks/usePulseNavigation.js";
import { useChat } from "./hooks/useChat.js";
import { InteractionHints } from "./components/InteractionHints.jsx";

export function App() {
  const [startView] = useState(readStartView),
    [view, setView] = useState(startView);
  const [toast, setToast] = useState(""),
    [pendingDocument, setPendingDocument] = useState(null);
  const [wireframe, setWireframe] = useState(
      new URLSearchParams(location.search).get("mode") === "wireframe",
    ),
    [resetKey, setResetKey] = useState(0);
  const deviceRef = useRef(null),
    surfaceRef = useRef(null),
    trackRef = useRef(null),
    layerRef = useRef(null),
    drawerRef = useRef(null),
    homeRef = useRef(null),
    inputRef = useRef(null);
  const {
    detail,
    setDetail,
    open: showDetail,
    close: hideDetail,
    backSwipe,
  } = usePulseNavigation(deviceRef);
  const scrollPosition = useRef(0),
    detailReturn = useRef(null);
  const conversation = useChat(),
    { chat } = conversation;
  const { diagnostic } = useGlassDiagnostics(surfaceRef);
  const [dockHeight, setDockHeight] = useState(118);
  const overlayOpen = Boolean(detail);
  const history = useHistoryDrawer({
    deviceRef,
    surfaceRef,
    trackRef,
    layerRef,
    drawerRef,
    onView: applyView,
    disabled: overlayOpen,
    initialView: startView,
    allowHistory: false,
  });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2300);
    return () => clearTimeout(id);
  }, [toast]);
  useLayoutEffect(() => {
    const fit = () => {
      if (new URLSearchParams(location.search).has("embed")) return;
      const available =
        window.innerHeight - (window.innerWidth > 1000 ? 86 : 120);
      deviceRef.current.parentElement.style.setProperty(
        "--scale",
        String(Math.min(1, Math.max(0.4, available / 874))),
      );
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useLayoutEffect(() => {
    homeRef.current.scrollTop = scrollPosition.current;
  }, [resetKey]);
  const closeDetail = useCallback(
    () =>
      hideDetail(() =>
        requestAnimationFrame(() => {
          if (
            detailReturn.current?.isConnected &&
            !window.frameElement?.inert &&
            !detailReturn.current.closest("[hidden],[inert]")
          )
            detailReturn.current.focus({ preventScroll: true });
        }),
      ),
    [hideDetail],
  );
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape" && detail) closeDetail();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [detail, closeDetail]);
  function applyView(next) {
    setDetail(null);
    setView(next);
    if (next !== "chat") inputRef.current?.blur();
  }
  function changeView(next) {
    history.setView(next);
  }
  function openDetail(item) {
    if (!canOpenDetail(item)) return;
    if (!detail) detailReturn.current = document.activeElement;
    showDetail(item);
  }
  function sendMessage(value) {
    if (conversation.sendMessage(value)) changeView("chat");
  }
  function reset() {
    conversation.reset();
    history.setView(startView);
    setDetail(null);
    setPendingDocument(null);
    scrollPosition.current = 0;
    setResetKey((key) => key + 1);
    setToast("Прототип сброшен");
  }
  useCaseBridge({
    swipeView: history.demoSwipe,
    backSwipe,
    closeDetail,
    enter(state) {
      const metric = metricsForDay(ACTIVITY_DAYS[0]).find(
        (item) => item.id === "pulse",
      );
      conversation.restore(state, metric);
      setWireframe(false);
      setPendingDocument(state === "notification" ? RESULTS[0] : null);
      history.setView(
        state.startsWith("widgets") || state.startsWith("pulse")
          ? "widgets"
          : "chat",
      );
      setResetKey((key) => key + 1);
      scrollPosition.current = 0;
      setDetail(state.startsWith("pulse") ? metric : null);
    },
  });
  return (
    <>
      <header className="workbench">
        <div>
          <p className="overline">СБЕРЗДОРОВЬЕ / КОНЦЕПТ 02</p>
          <p className="workbench-note">Демо</p>
        </div>
        <div className="workbench-actions">
          <a
            className="history-link"
            href="history/index.html"
            target="_blank"
            rel="noreferrer"
          >
            История
          </a>
          <div className="mode-switch" aria-label="Отображение прототипа">
            <button aria-pressed={wireframe} onClick={() => setWireframe(true)}>
              Каркас
            </button>
            <button
              aria-pressed={!wireframe}
              onClick={() => setWireframe(false)}
            >
              С данными
            </button>
          </div>
          <button className="reset" onClick={reset}>
            Сбросить
          </button>
        </div>
      </header>
      <main className="stage">
        <div className="device-size">
          <section
            className={`device ${view === "chat" ? "assistant-mode" : "overview-mode"}${wireframe ? " is-wireframe" : ""}${detail?.kind === "metric" ? " metric-detail-open" : ""}${detail ? " pulse-navigation-active" : ""}`}
            id="device"
            ref={deviceRef}
            data-overlay-open={overlayOpen || undefined}
            aria-label="Мобильный прототип помощника"
          >
            <img
              className="status-bar"
              src="assets/status-bar.png"
              width="400"
              height="62"
              alt="9:41, мобильная сеть, Wi-Fi, заряд батареи"
            />
            <GlassScene
              className="page-surface"
              id="page-surface"
              ref={surfaceRef}
              tabIndex={-1}
              material="regular"
              appearance="light"
              maxSurfaces={8}
              data-glass-state="loading"
              onDiagnostic={diagnostic}
              style={{ "--chat-dock-height": `${dockHeight}px` }}
            >
              <AppHeader
                view={view}
                onView={changeView}
                disabled={overlayOpen}
              />
              <GlassContent className="view-viewport" inert={overlayOpen}>
                <div className="view-track" ref={trackRef}>
                  <div
                    className="view-page chat-page"
                    inert={view !== "chat"}
                    aria-hidden={view !== "chat"}
                  >
                    <ChatView
                      chat={chat}
                      active={view === "chat"}
                      motionActive={
                        view === "chat" &&
                        !overlayOpen &&
                        !history.open &&
                        !wireframe
                      }
                      notification={pendingDocument}
                    />
                  </div>
                  <div
                    className="view-page widgets-page"
                    inert={view !== "widgets"}
                    aria-hidden={view !== "widgets"}
                  >
                    <div
                      className="home-scroll"
                      id="home-scroll"
                      ref={homeRef}
                      onScroll={(e) => {
                        if (view === "widgets")
                          scrollPosition.current = e.currentTarget.scrollTop;
                      }}
                    >
                      <Widgets
                        key={resetKey}
                        active={view === "widgets"}
                        motionActive={
                          view === "widgets" &&
                          !overlayOpen &&
                          !history.open &&
                          !wireframe
                        }
                        onOpen={openDetail}
                      />
                    </div>
                  </div>
                </div>
              </GlassContent>
              <div
                className="status-edge-blur"
                aria-hidden="true"
                hidden={overlayOpen}
              >
                <i />
                <i />
                <i />
              </div>
              <div
                className="scroll-edge-wash scroll-edge-wash-top"
                aria-hidden="true"
                hidden={overlayOpen}
              />
              <div
                className="scroll-edge-wash scroll-edge-wash-bottom"
                aria-hidden="true"
                hidden={overlayOpen}
              />
              <Composer
                visible={!overlayOpen}
                active={view === "chat" && !overlayOpen}
                chat={chat}
                onDraft={conversation.setDraft}
                onSend={sendMessage}
                onRemoveContext={conversation.removeContext}
                onClearContext={conversation.clearContext}
                onSize={setDockHeight}
                inputRef={inputRef}
              />
              {detail && (
                <PulseDetails
                  key={detail.id}
                  metric={detail}
                  onClose={closeDetail}
                  backSwipe={backSwipe}
                />
              )}
              <div className={`toast${toast ? " visible" : ""}`} role="status">
                {toast}
              </div>
            </GlassScene>
            <div
              className="history-layer"
              ref={layerRef}
              hidden
              aria-hidden="true"
            >
              <div ref={drawerRef} inert />
            </div>
            <img
              className="home-indicator"
              src="assets/home-indicator.png"
              width="400"
              height="34"
              alt=""
            />
            <InteractionHints
              deviceRef={deviceRef}
              contextKey={`${view}:${detail?.id || ""}:${resetKey}`}
            />
          </section>
        </div>
      </main>
    </>
  );
}
