import { describe, expect, it } from "vitest";
import type { GameCommand } from "@empire/protocol";

import {
  applyCommand,
  createWorld,
  hydrateWorld,
  snapshotWorld,
} from "./index";

describe("劳动力政策权威命令", () => {
  it("修改工资和行业优先级会原子保存并可恢复", () => {
    const world = createWorld();
    expect(snapshotWorld(world).laborPolicy).toBeUndefined();

    const application = applyCommand(world, {
      seq: 1,
      type: "set-labor-policy",
      wageLevel: "high",
      priorities: ["commerce", "services", "agriculture"],
    });

    expect(application.result).toMatchObject({ accepted: true, revision: 1 });
    expect(application.snapshot.laborPolicy).toEqual({
      wageLevel: "high",
      priorities: ["commerce", "services", "agriculture"],
    });
    expect(
      snapshotWorld(hydrateWorld(application.snapshot)).laborPolicy,
    ).toEqual(application.snapshot.laborPolicy);
  });

  it("重复提交同一策略不制造 revision", () => {
    const world = createWorld();
    const command: GameCommand = {
      seq: 1,
      type: "set-labor-policy" as const,
      wageLevel: "standard" as const,
      priorities: ["agriculture", "commerce", "services"],
    };

    expect(applyCommand(world, command).result).toMatchObject({
      accepted: true,
      revision: 0,
    });
  });
});
