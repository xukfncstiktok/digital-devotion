# Digital Devotion

Build a web-based, real-time 3D simulation of a digital life form powered by the connectivity and neurological structure of the male Central Nervous System (CNS) of the fruit fly, using data and biological insights from the official repository: https://github.com/natverse/malecns.

Instead of acting like a fly, this digital brain must be translated/scaled to simulate a human-like life, specifically routine daily activities (working, resting) while strictly adhering to a Muslim lifestyle (e.g., stopping work to pray based on a simulated timeline).

1. Brain Data Integration (Core System)

Mandatory Data Source: You must utilize the malecns repository/data structure. Do not invent a generic neural network or make up a brain structure from scratch.

Biological Accuracy: Use the actual mapped cells, neural clusters, and synaptic pathways provided by the malecns connectome.

Behavioral Mapping: Translate the fly's behavioral circuits into human analogs. For example:

Map locomotion/flight navigation circuits to human locomotion and task-oriented movement (walking to a workstation).

Map sensory integration areas to respond to simulated environmental stimuli (noticing a clock, hearing an alarm).

2. Simulated Behavior & Lifestyle (The Human/Muslim Concept)

Working & Routine: The agent must have a daily schedule. It "works" at a desk or task station, expends simulated energy, and requires rest.

Islamic Routine Integration: The agent’s core driving routine must incorporate the five daily prayers (Salah).

The neural circuits responsible for time tracking or environmental cues must trigger a priority shift.

The agent must stop working, perform a simulated cleaning ritual (Wudu), and transition to a prayer state (facing a designated direction).

3. Real-Time 3D Visualization

Realistic Assets: Do not use low-poly or abstract shapes. Use highly realistic, fully textured 3D models for the environment, the human avatar representing the agent, and the workstation.

Rendering Engine: Implement the simulation using WebGL via a library like Three.js or Babylon.js to ensure smooth, high-fidelity rendering in the browser.

4. Diagnostic Sidebar & Neural Tracker

Interactive Sidebar: Create a toggleable panel or sidebar in the user interface.

Live Neural Diagnostics: This sidebar must display a live, real-time feed of what is happening inside the malecns brain structure. It must show:

Which specific cell types are currently firing or highly active.

The neural pathways experiencing high synaptic traffic based on the agent's current action (e.g., visual processing cells firing when looking at the workspace, motor circuits firing when moving to pray).

A clean, searchable list or visual tree of the connectome nodes currently engaged in the simulation loop.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1096d618-5f00-4e7f-8ec7-d21785f98388).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
