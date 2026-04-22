# 📐 TS-to-Diagram

**Instantly turn your TypeScript code into visual diagrams.**

![Complex SaaS Schema Preview](/public/preview.svg)

A powerful, industrial-grade web tool that transforms complex TypeScript interfaces and enums into interactive, high-fidelity diagrams. Built with a focus on **lossless parsing**—ensuring every field, audit timestamp, and nested object is captured and visualized.

[**Live Demo**](https://ts-to-diagram.sahilatahar.dev/) | [**Report Bug**](https://github.com/sahilatahar/TS-to-Diagram/issues)

## ✨ Features

- **⚡ Lossless Parsing Engine**: Unlike standard parsers that trip over complex Mongoose types or union types, our engine captures every line, including `Types.ObjectId`, JSDoc comments, and multi-line definitions.
- **🎨 Neo-Brutalist UI**: A high-contrast, industrial minimalism aesthetic built with **Tailwind CSS v4** and a grayscale-first palette.
- **🔗 Intelligent Connectivity**: Automatically detects relationships between interfaces and enums, drawing precise wires using the Dagre layout engine.
- **📦 Nested Object Support**: Handles inline object definitions (e.g., `metadata: { ... }`) by flattening them into clean, readable node entries.
- **📥 SVG Export**: Download your entire architecture as a crisp, scalable SVG for documentation, Figma, or presentations.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (CSS-variable-first approach)
- **Diagramming**: [React Flow](https://reactflow.dev/)
- **Layout Engine**: [Dagre](https://github.com/dagrejs/dagre)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Export**: [html-to-image](https://www.google.com/search?q=https://github.com/tsayen/html-to-image)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/sahilatahar/TS-to-Diagram.git
    cd ts-to-diagram
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Start the development server:

    ```bash
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📖 Usage

1.  **Input**: Paste your TypeScript `interface` or `enum` definitions into the left-hand editor.
2.  **Visualize**: Click the **"Rebuild Diagram"** button. The diagram will automatically recalculate heights and redraw connection wires.
3.  **Download**: Use the **"Download SVG"** button in the header to save a vector image of your entire architecture.

## 🤝 Contributing

Contributions are welcome\! If you find a specific TypeScript syntax that breaks the parser, please open an issue with a code snippet.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
