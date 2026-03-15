import type { CliffFacePreset } from "./types.js";

export const CLIFF_FACE_PRESETS: CliffFacePreset[] = [
  {
    id: "granite-cliff",
    name: "Granite Cliff",
    description: "Hard Cape Ann–style granite cliff with warm grey lit face and cool blue-grey shadow, angular fracture profile",
    tags: ["granite", "grey", "hard", "mountain"],
    category: "cliff-face",
    textureMode: "granite",
    color: "#ADA090",      // warm grey-pink lit face (HSL ~15°, 8% sat, 67% L)
    shadowColor: "#505870", // cool blue-grey shadow (HSL ~215°, 15% sat, 37% L)
    height: 0.6,
    xPosition: 0.0,
    width: 0.35,
    roughness: 0.6,
    ledgeCount: 4,
  },
  {
    id: "sandstone-wall",
    name: "Sandstone Wall",
    description: "Mesa-style sandstone with warm orange-tan lit face, warm red-brown shadow, prominent horizontal strata and desert varnish streaks",
    tags: ["sandstone", "warm", "layered", "desert"],
    category: "cliff-face",
    textureMode: "sandstone",
    color: "#C48850",      // orange-tan lit face (HSL ~28°, 50% sat, 55% L)
    shadowColor: "#7B4028", // warm red-brown shadow (HSL ~22°, 50% sat, 32% L)
    height: 0.5,
    xPosition: 0.0,
    width: 0.4,
    roughness: 0.4,
    ledgeCount: 7,
  },
  {
    id: "basalt-columns",
    name: "Basalt Columns",
    description: "Dark volcanic basalt with vertical columnar jointing and stepped top profile; very strong shadow contrast",
    tags: ["basalt", "volcanic", "dark", "columns"],
    category: "cliff-face",
    textureMode: "basalt",
    color: "#484858",      // dark blue-grey lit face (HSL ~240°, 8% sat, 31% L)
    shadowColor: "#18181E", // near-black cool shadow (HSL ~240°, 7% sat, 11% L)
    height: 0.7,
    xPosition: 0.0,
    width: 0.3,
    roughness: 0.35,
    ledgeCount: 2,
  },
  {
    id: "limestone-face",
    name: "Limestone Face",
    description: "Light weathered limestone with irregular crack system and pale cool shadow",
    tags: ["limestone", "light", "weathered", "cracks"],
    category: "cliff-face",
    textureMode: "limestone",
    color: "#C8C8B8",      // pale warm-grey lit face
    shadowColor: "#787880", // cool grey-blue shadow
    height: 0.55,
    xPosition: 0.0,
    width: 0.35,
    roughness: 0.55,
    ledgeCount: 5,
  },
  {
    id: "shale-cliff",
    name: "Shale Cliff",
    description: "Crumbling dark shale cliff with thin horizontal layers and rough eroded edges",
    tags: ["shale", "dark", "crumbling", "layered"],
    category: "cliff-face",
    textureMode: "sandstone",
    color: "#6A6870",      // cool dark grey-purple lit face
    shadowColor: "#282830", // very dark cool shadow
    height: 0.5,
    xPosition: 0.0,
    width: 0.3,
    roughness: 0.85,
    ledgeCount: 8,
  },
];
