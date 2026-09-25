"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
let source = fs.readFileSync(path.join(root, "script.js"), "utf8");
source = source.replace(/\ninit\(\);\s*$/, "\n;globalThis.__NEXUS_TEST__ = { SCENES, ENDINGS, DEATHS, TRUCKS, ALERTS };");

const fakeCanvasContext = {
  setTransform() {}, clearRect() {}, fillRect() {},
  set fillStyle(value) {}, set globalAlpha(value) {}
};
const fakeElement = {
  getContext() { return fakeCanvasContext; }
};
const context = {
  console: { info() {}, warn() {}, error() {}, log() {} },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  document: { getElementById() { return fakeElement; } },
  performance,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "script.js" });

const { SCENES, ENDINGS, DEATHS, TRUCKS, ALERTS } = context.__NEXUS_TEST__;
const errors = [];
const minigames = new Set();
const graph = new Map();

Object.entries(SCENES).forEach(([id, scene]) => {
  const edges = [];
  (scene.choices || []).forEach((choice) => {
    if (typeof choice.to === "string") {
      edges.push(choice.to);
      if (!SCENES[choice.to]) errors.push(id + " aponta para cena inexistente: " + choice.to);
    }
    if (choice.ending && !ENDINGS[choice.ending]) {
      errors.push(id + " aponta para final inexistente: " + choice.ending);
    }
    if (typeof choice.death === "string" && !DEATHS[choice.death]) {
      errors.push(id + " aponta para morte inexistente: " + choice.death);
    }
  });
  if (scene.mini) {
    minigames.add(scene.mini.type);
    ["win", "fail"].forEach((result) => {
      if (typeof scene.mini[result] === "string") {
        edges.push(scene.mini[result]);
        if (!SCENES[scene.mini[result]]) {
          errors.push(id + " aponta para cena inexistente: " + scene.mini[result]);
        }
      }
    });
    if (typeof scene.mini.death === "string" && !DEATHS[scene.mini.death]) {
      errors.push(id + " aponta para morte de minigame inexistente: " + scene.mini.death);
    }
  }
  if (scene.surprise && !ALERTS[scene.surprise]) errors.push(id + " usa alerta inexistente: " + scene.surprise);
  if (scene.afterTruck) {
    edges.push(scene.afterTruck);
    if (!SCENES[scene.afterTruck]) errors.push(id + " aponta para cena inexistente: " + scene.afterTruck);
  }
  graph.set(id, edges);
});

// Destinos que dependem do estado da partida.
graph.get("forestHunter").push("safehouse");
graph.get("underground").push("safehouse", "coreLift");

const reached = new Set(["blackout"]);
const queue = ["blackout"];
while (queue.length) {
  const id = queue.shift();
  (graph.get(id) || []).forEach((next) => {
    if (!reached.has(next)) {
      reached.add(next);
      queue.push(next);
    }
  });
}
Object.keys(SCENES).forEach((id) => {
  if (!reached.has(id)) errors.push("Cena inalcançável: " + id);
});

const collectibleEndings = Object.keys(ENDINGS).filter((id) => id !== "lost");
if (collectibleEndings.length !== 7) errors.push("Esperados 7 finais; encontrados " + collectibleEndings.length);
if (Object.keys(TRUCKS).length !== 4) errors.push("Esperados 4 caminhões");
if (Object.keys(DEATHS).length < 4) errors.push("Esperadas pelo menos 4 mortes antecipadas");
if (minigames.size !== 9) errors.push("Esperados 9 minigames; encontrados " + [...minigames].join(", "));
if (Object.keys(SCENES).length < 35) errors.push("A campanha deve possuir pelo menos 35 cenas");

if (errors.length) {
  console.error("Smoke test falhou:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(
  "NEXUS validado:",
  Object.keys(SCENES).length + " cenas,",
  minigames.size + " minigames,",
  Object.keys(TRUCKS).length + " caminhões,",
  collectibleEndings.length + " finais,",
  Object.keys(DEATHS).length + " mortes antecipadas."
);
