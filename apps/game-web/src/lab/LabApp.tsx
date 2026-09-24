import {
  WORLD_RESERVE_ACCOUNT,
  type KernelEvent,
  type ReplayReport,
  type WorldCommand,
  type WorldObject,
} from "@empire/world-kernel";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LabPresentationFrame, LabSpeed } from "./lab-protocol";
import { LabViewport } from "./LabViewport";
import { LabWorkerClient } from "./lab-worker-client";

type InspectorTab = "object" | "ledger" | "kernel";

const REASON_LABELS: Record<string, string> = {
  "object-not-found": "对象不存在",
  "account-not-found": "账户不存在",
  "insufficient-matter": "物质不足",
  "insufficient-energy": "能量不足",
  "out-of-bounds": "超出边界",
  "invalid-amount": "数量无效",
  "same-account": "账户相同",
  "invalid-tick-count": "时间步无效",
  "conservation-violation": "违反守恒",
};

function shortId(id: string): string {
  return id.split("-").at(-1)?.toUpperCase() ?? id;
}

function shapeLabel(object: WorldObject): string {
  return object.collision.kind === "box" ? "箱形代理" : "球形代理";
}

function eventKindLabel(type: KernelEvent["commandType"]): string {
  switch (type) {
    case "advance":
      return "时间";
    case "create-object":
      return "制造";
    case "move-object":
      return "位移";
    case "transfer-resource":
      return "转移";
  }
}

export function LabApp() {
  const clientRef = useRef<LabWorkerClient | null>(null);
  const [frame, setFrame] = useState<LabPresentationFrame>();
  const [selectedObjectId, setSelectedObjectId] = useState<string>();
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("object");
  const [replayReport, setReplayReport] = useState<ReplayReport>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const client = new LabWorkerClient({
      onFrame: (nextFrame) => {
        setFrame(nextFrame);
        setError(undefined);
      },
      onReplay: setReplayReport,
      onError: setError,
    });
    clientRef.current = client;
    client.initialize();
    return () => {
      clientRef.current = null;
      client.dispose();
    };
  }, []);

  useEffect(() => {
    if (!frame) return;
    const stillExists = frame.snapshot.objects.some(
      (object) => object.id === selectedObjectId,
    );
    if (!stillExists) setSelectedObjectId(frame.snapshot.objects[0]?.id);
  }, [frame, selectedObjectId]);

  const selectedObject = useMemo(
    () =>
      frame?.snapshot.objects.find((object) => object.id === selectedObjectId),
    [frame, selectedObjectId],
  );

  const command = (nextCommand: WorldCommand) => {
    setReplayReport(undefined);
    clientRef.current?.command(nextCommand);
  };

  const createObject = (shape: "box" | "sphere") => {
    const count = frame?.snapshot.objects.length ?? 0;
    const x = -6 + ((count * 3) % 13);
    const z = -4 + ((Math.floor(count / 4) * 3) % 9);
    command({
      type: "create-object",
      shape,
      position: { x, y: 0, z },
    });
  };

  const moveSelected = (dx: number, dz: number) => {
    if (!selectedObject) return;
    command({
      type: "move-object",
      objectId: selectedObject.id,
      position: {
        x: selectedObject.position.x + dx,
        y: selectedObject.position.y,
        z: selectedObject.position.z + dz,
      },
    });
  };

  const transferEnergy = (amount: number) => {
    if (!selectedObject) return;
    command({
      type: "transfer-resource",
      resource: "energy",
      from: WORLD_RESERVE_ACCOUNT,
      to: selectedObject.id,
      amount,
    });
  };

  const setSpeed = (speed: LabSpeed) => clientRef.current?.setSpeed(speed);
  const snapshot = frame?.snapshot;

  return (
    <main className="lab-shell">
      <header className="lab-topbar">
        <div className="lab-brand">
          <a className="lab-back" href="/">
            ← 城市
          </a>
          <div>
            <span className="lab-kicker">WORLD KERNEL · L1</span>
            <h1>可编程物理实验室</h1>
          </div>
        </div>

        <div className="lab-clock" aria-label="实验时钟控制">
          <button
            className="lab-control lab-control-primary"
            type="button"
            data-testid="lab-run-toggle"
            aria-pressed={frame?.running ?? false}
            onClick={() => clientRef.current?.setRunning(!frame?.running)}
          >
            {frame?.running ? "暂停" : "运行"}
          </button>
          <button
            className="lab-control"
            type="button"
            onClick={() => command({ type: "advance", ticks: 1 })}
          >
            单步
          </button>
          <div className="lab-speed" aria-label="运行倍速">
            {([1, 2, 4] as const).map((speed) => (
              <button
                type="button"
                key={speed}
                aria-pressed={frame?.speed === speed}
                onClick={() => setSpeed(speed)}
              >
                {speed}×
              </button>
            ))}
          </div>
          <button
            className="lab-control"
            type="button"
            data-testid="lab-replay"
            onClick={() => clientRef.current?.replay()}
          >
            校验重放
          </button>
          <button
            className="lab-control lab-control-quiet"
            type="button"
            onClick={() => {
              setReplayReport(undefined);
              clientRef.current?.reset();
            }}
          >
            重置
          </button>
        </div>

        <div className="lab-hash" data-testid="lab-state-hash">
          <span>STATE HASH</span>
          <strong>{snapshot?.stateHash ?? "连接中…"}</strong>
        </div>
      </header>

      <section className="lab-workbench">
        <aside className="lab-catalogue" aria-label="实验对象目录">
          <div className="lab-panel-heading">
            <span>01 / OBJECTS</span>
            <strong>{snapshot?.objects.length ?? 0}</strong>
          </div>

          <div className="lab-tool-pair">
            <button type="button" onClick={() => createObject("box")}>
              <span className="lab-shape-glyph lab-shape-box" />
              制造箱体
              <small>12 M · 2 E</small>
            </button>
            <button type="button" onClick={() => createObject("sphere")}>
              <span className="lab-shape-glyph lab-shape-sphere" />
              制造球体
              <small>8 M · 1 E</small>
            </button>
          </div>

          <div className="lab-object-list" data-testid="lab-object-list">
            {snapshot?.objects.map((object) => (
              <button
                type="button"
                key={object.id}
                className={
                  object.id === selectedObjectId ? "is-selected" : undefined
                }
                aria-pressed={object.id === selectedObjectId}
                onClick={() => setSelectedObjectId(object.id)}
              >
                <span className={`lab-object-mark ${object.collision.kind}`} />
                <span>
                  <strong>{object.label}</strong>
                  <small>
                    {shortId(object.id)} · {shapeLabel(object)}
                  </small>
                </span>
                <em>{object.energy} E</em>
              </button>
            ))}
          </div>

          <div className="lab-reserve-card">
            <span>WORLD RESERVE</span>
            <div>
              <strong data-testid="lab-reserve-matter">
                {snapshot?.reserve.matter ?? "—"}
              </strong>
              <small>物质 M</small>
            </div>
            <div>
              <strong data-testid="lab-reserve-energy">
                {snapshot?.reserve.energy ?? "—"}
              </strong>
              <small>能量 E</small>
            </div>
          </div>
        </aside>

        <section className="lab-stage" aria-label="三维实验场">
          <LabViewport
            snapshot={snapshot}
            selectedObjectId={selectedObjectId}
            onObjectSelect={setSelectedObjectId}
          />
          <div className="lab-stage-index" aria-hidden="true">
            <span>−9</span>
            <span>0</span>
            <span>+9</span>
          </div>
          <div className="lab-stage-status">
            <span className={frame?.running ? "is-live" : undefined} />
            {frame?.running ? `${frame.speed}× 运行中` : "世界已暂停"}
          </div>
          <div className="lab-stage-readout">
            <span>TICK</span>
            <strong data-testid="lab-tick">{snapshot?.tick ?? 0}</strong>
            <span>REV</span>
            <strong>{snapshot?.revision ?? 0}</strong>
          </div>
        </section>

        <aside className="lab-inspector" aria-label="对象检查器">
          <div className="lab-inspector-tabs" role="tablist">
            {(
              [
                ["object", "对象"],
                ["ledger", "账本"],
                ["kernel", "内核"],
              ] as const
            ).map(([tab, label]) => (
              <button
                type="button"
                role="tab"
                key={tab}
                aria-selected={inspectorTab === tab}
                onClick={() => setInspectorTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>

          {inspectorTab === "object" && (
            <ObjectInspector
              object={selectedObject}
              onMove={moveSelected}
              onTransferEnergy={transferEnergy}
            />
          )}
          {inspectorTab === "ledger" && (
            <LedgerInspector frame={frame} object={selectedObject} />
          )}
          {inspectorTab === "kernel" && (
            <KernelInspector frame={frame} replayReport={replayReport} />
          )}
        </aside>
      </section>

      <section className="lab-timeline" aria-label="因果事件时间线">
        <div className="lab-timeline-heading">
          <span>CAUSAL TRACK</span>
          <strong>因果轨道</strong>
          <small>{frame?.commandCount ?? 0} 条命令</small>
        </div>
        <div className="lab-event-track" data-testid="lab-event-track">
          {frame?.events.length ? (
            [...frame.events].reverse().map((event) => (
              <article key={event.id} className={`lab-event ${event.status}`}>
                <div className="lab-event-node" />
                <header>
                  <span>#{event.commandId}</span>
                  <strong>{eventKindLabel(event.commandType)}</strong>
                  <time>T{event.tick}</time>
                </header>
                <p>{event.summary}</p>
                <footer>
                  {event.status === "accepted"
                    ? "已结算"
                    : `拒绝 · ${REASON_LABELS[event.reasonCode ?? ""] ?? event.reasonCode}`}
                </footer>
              </article>
            ))
          ) : (
            <div className="lab-empty-track">
              执行单步、制造或转移资源，第一条因果记录会出现在这里。
            </div>
          )}
        </div>
      </section>

      {error && <div className="lab-error">{error}</div>}
    </main>
  );
}

function ObjectInspector({
  object,
  onMove,
  onTransferEnergy,
}: {
  object?: WorldObject;
  onMove: (dx: number, dz: number) => void;
  onTransferEnergy: (amount: number) => void;
}) {
  if (!object) {
    return <div className="lab-empty-inspector">选择一个对象以检查状态。</div>;
  }
  return (
    <div className="lab-inspector-content" data-testid="lab-selected-object">
      <div className="lab-selected-title">
        <span>ID · {object.id}</span>
        <h2>{object.label}</h2>
        <p>
          {shapeLabel(object)} · 所有者 {object.ownerId}
        </p>
      </div>
      <dl className="lab-property-grid">
        <div>
          <dt>物质</dt>
          <dd>{object.matter} M</dd>
        </div>
        <div>
          <dt>能量</dt>
          <dd>{object.energy} E</dd>
        </div>
        <div>
          <dt>位置 X</dt>
          <dd>{object.position.x.toFixed(1)}</dd>
        </div>
        <div>
          <dt>位置 Z</dt>
          <dd>{object.position.z.toFixed(1)}</dd>
        </div>
      </dl>
      <section className="lab-inspector-section">
        <header>
          <span>空间事务</span>
          <small>每次移动 1 格</small>
        </header>
        <div className="lab-move-pad" aria-label="移动所选对象">
          <button type="button" onClick={() => onMove(0, -1)}>
            ↑
          </button>
          <button type="button" onClick={() => onMove(-1, 0)}>
            ←
          </button>
          <i>XZ</i>
          <button type="button" onClick={() => onMove(1, 0)}>
            →
          </button>
          <button type="button" onClick={() => onMove(0, 1)}>
            ↓
          </button>
        </div>
      </section>
      <section className="lab-inspector-section">
        <header>
          <span>能量转移</span>
          <small>来源：世界储备</small>
        </header>
        <div className="lab-action-stack">
          <button type="button" onClick={() => onTransferEnergy(5)}>
            转入 5 E
          </button>
          <button
            className="lab-danger-action"
            type="button"
            data-testid="lab-overdraft"
            onClick={() => onTransferEnergy(999)}
          >
            尝试透支 999 E
          </button>
        </div>
      </section>
      <section className="lab-program-placeholder">
        <span>CONSTITUTIVE PROGRAM</span>
        <strong>L2 解锁</strong>
        <p>下一阶段，对象将在预算内提交效应提案。</p>
      </section>
    </div>
  );
}

function LedgerInspector({
  frame,
  object,
}: {
  frame?: LabPresentationFrame;
  object?: WorldObject;
}) {
  const snapshot = frame?.snapshot;
  return (
    <div className="lab-inspector-content">
      <div className="lab-selected-title">
        <span>CONSERVATION LEDGER</span>
        <h2>守恒账本</h2>
        <p>对象只能在账户之间转移资源，世界总量保持不变。</p>
      </div>
      <dl className="lab-ledger-total">
        <div>
          <dt>物质总量</dt>
          <dd>{snapshot?.totals.matter ?? "—"} M</dd>
          <small>储备 {snapshot?.reserve.matter ?? "—"}</small>
        </div>
        <div>
          <dt>能量总量</dt>
          <dd>{snapshot?.totals.energy ?? "—"} E</dd>
          <small>储备 {snapshot?.reserve.energy ?? "—"}</small>
        </div>
      </dl>
      {object && (
        <div className="lab-account-route">
          <div>
            <span>世界储备</span>
            <strong>{snapshot?.reserve.energy} E</strong>
          </div>
          <i>事务结算 →</i>
          <div>
            <span>{object.label}</span>
            <strong>{object.energy} E</strong>
          </div>
        </div>
      )}
      <div className="lab-rule-list">
        <p>
          <span>01</span> 无合法来源，不能增加账户余额
        </p>
        <p>
          <span>02</span> 事务失败时，所有变化整体回滚
        </p>
        <p>
          <span>03</span> 拒绝也进入命令历史，可确定性重放
        </p>
      </div>
    </div>
  );
}

function KernelInspector({
  frame,
  replayReport,
}: {
  frame?: LabPresentationFrame;
  replayReport?: ReplayReport;
}) {
  return (
    <div className="lab-inspector-content">
      <div className="lab-selected-title">
        <span>AUTHORITY BOUNDARY</span>
        <h2>权威内核</h2>
        <p>UI 只发送命令；时间、对象和账本全部由 Worker 推进。</p>
      </div>
      <dl className="lab-kernel-stats">
        <div>
          <dt>种子</dt>
          <dd>{frame?.snapshot.seed ?? "—"}</dd>
        </div>
        <div>
          <dt>Schema</dt>
          <dd>v{frame?.snapshot.schemaVersion ?? "—"}</dd>
        </div>
        <div>
          <dt>命令</dt>
          <dd>{frame?.commandCount ?? 0}</dd>
        </div>
        <div>
          <dt>边界</dt>
          <dd>±{frame?.snapshot.bounds ?? 0}</dd>
        </div>
      </dl>
      <div
        className={`lab-replay-report ${replayReport?.matches ? "is-match" : ""}`}
        data-testid="lab-replay-report"
      >
        {replayReport ? (
          <>
            <span>{replayReport.matches ? "REPLAY MATCH" : "DIVERGENCE"}</span>
            <strong>
              {replayReport.matches ? "重放完全一致" : "检测到状态分歧"}
            </strong>
            <p>
              {replayReport.commandCount} 条命令 · {replayReport.actualHash}
            </p>
          </>
        ) : (
          <>
            <span>REPLAY NOT RUN</span>
            <strong>等待校验</strong>
            <p>点击顶部“校验重放”，从相同种子重新执行全部命令。</p>
          </>
        )}
      </div>
    </div>
  );
}
