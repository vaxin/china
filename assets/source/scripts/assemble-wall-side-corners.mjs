import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const outputDirectory = resolve(
  repositoryRoot,
  "apps/game-web/public/assets/runtime/v8/defense",
);
const atlasPath = resolve(
  repositoryRoot,
  "apps/game-web/public/assets/runtime/v6/defense/wall-autotiles-4x4.png",
);
const atlasDataUrl = `data:image/png;base64,${(
  await readFile(atlasPath)
).toString("base64")}`;

const browser = await chromium.launch({ channel: "chromium" });
try {
  const page = await browser.newPage();
  const junctions = await page.evaluate(async (atlasSource) => {
    const atlas = new Image();
    atlas.src = atlasSource;
    await atlas.decode();

    const frameSize = atlas.naturalWidth / 4;
    const halfFrame = frameSize / 2;
    const outputSize = Math.round(frameSize);
    const halfOutput = outputSize / 2;

    // The four cardinal arms are the matching half of the two proven straight
    // frames. Every half terminates at the exact canvas centre, so corners,
    // T junctions and crosses all share one pixel anchor.
    const armByBit = {
      1: { column: 1, side: "left" },
      2: { column: 2, side: "right" },
      4: { column: 1, side: "right" },
      8: { column: 2, side: "left" },
    };
    const paintOrder = [8, 4, 1, 2];

    const compose = (mask) => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("2D canvas context unavailable");
      context.imageSmoothingEnabled = false;

      for (const bit of paintOrder) {
        if ((mask & bit) === 0) continue;
        const arm = armByBit[bit];
        const sourceOffset = arm.side === "right" ? halfFrame : 0;
        const destinationOffset = arm.side === "right" ? halfOutput : 0;
        context.drawImage(
          atlas,
          arm.column * frameSize + sourceOffset,
          0,
          halfFrame,
          frameSize,
          destinationOffset,
          0,
          halfOutput,
          outputSize,
        );
      }
      return canvas.toDataURL("image/png").split(",", 2)[1];
    };

    return {
      images: Object.fromEntries(
        [3, 6, 7, 9, 11, 12, 13, 14, 15].map((mask) => [mask, compose(mask)]),
      ),
      outputSize,
    };
  }, atlasDataUrl);

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    Object.entries(junctions.images).map(([mask, image]) =>
      writeFile(
        resolve(
          outputDirectory,
          `wall-junction-${Number(mask).toString(16).padStart(2, "0")}.png`,
        ),
        Buffer.from(image, "base64"),
      ),
    ),
  );
  console.info(
    `wrote ${Object.keys(junctions.images).length} ${junctions.outputSize}×${junctions.outputSize} junctions`,
  );
} finally {
  await browser.close();
}
