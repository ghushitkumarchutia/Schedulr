# 💻 Schedulr: An Intelligent CPU Scheduler Simulator

<p>A <strong>web-based simulator</strong> that visualizes various CPU scheduling algorithms with <strong>interactive graphs</strong> and <strong>real-time performance metrics</strong>.</p>

---

## 🚀 Features

### 📌 Multiple Scheduling Algorithms

- First-Come-First-Served (FCFS)
- Shortest Job First (SJF) (Preemptive & Non-Preemptive)
- Round Robin (Configurable Time Quantum)
- Priority Scheduling (Preemptive & Non-Preemptive)

### 🔧 Interactive Process Management

- Add, edit, and remove processes
- Specify process details: Process ID, Arrival Time, Burst Time, Priority
- Import & Export process configurations

### 📊 Real-time Visualizations

- **Gantt Chart** – Shows execution sequence
- **Timeline View** – Displays process states (Ready, Running, Waiting, Completed)
- **Automatic Updates** – Live adjustments on data/algorithm changes

### 📈 Performance Metrics

- Average Waiting Time
- Average Turnaround Time
- CPU Utilization
- Throughput Calculations

### 🔍 Algorithm Comparison

- Compare multiple scheduling algorithms side by side
- Identify the most efficient scheduling strategy

---

## 🛠️ Tech Stack

<ul>
  <li><strong>Frontend:</strong> React with Vite, TailwindCSS, Lucide React for icons</li>
  <li><strong>Backend:</strong> Go</li>
  <li><strong>Development Tools:</strong> ESLint, npm/yarn, Go modules</li>
</ul>

---

## 📦 Installation

### Prerequisites

- Node.js (v16.0 or higher)
- Go (v1.18 or higher)
- git

### Setup Instructions

<details>
  <summary>🔧 Click to Expand Setup Instructions</summary>

1. Clone the repository:

   ```bash
   git clone https://github.com/GhushitDevX/CPU_Scheduler
   cd CPU_Scheduler
   ```

2. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:

   ```bash
   cd ../backend
   go mod download
   ```

4. Create `.env` file:

   ```bash
   cd ../frontend
   cp .env.example .env
   ```

5. Start development servers:

   **Backend:**

   ```bash
   cd ../backend
   go run main.go
   ```

   **Frontend (in a separate terminal):**

   ```bash
   cd ../frontend
   npm run dev
   ```

6. Open your browser and navigate to:
   [http://localhost:5173](http://localhost:5173)

</details>

---

## 📘 Usage Guide

### ➕ Adding Processes

- Use the process input form to add process details
- Each process requires an ID, arrival time, and burst time
- Priority is optional and only needed for Priority Scheduling

### ⚙️ Selecting an Algorithm

- Choose an algorithm from the dropdown menu
- Configure algorithm-specific parameters (e.g., time quantum for Round Robin)

### ▶️ Running the Simulation

- Click the **"Run Simulation"** button
- View the **Gantt chart** for the execution sequence
- See **performance metrics** displayed below

### 📊 Comparing Algorithms

- Switch between algorithms to compare their performance
- Use **"Compare All"** to see side-by-side metrics

---

## 🧱 Project Structure

<table>
  <tr>
    <td>backend/</td>
    <td>go.mod, go.sum, main.go</td>
  </tr>
  <tr>
    <td>frontend/</td>
    <td>src/, public/, package.json, vite.config.js, .env, etc.</td>
  </tr>
  <tr>
    <td>README.md</td>
    <td>Main documentation file</td>
  </tr>
</table>

---

## 🤝 Contributing

Contributions are welcome!  
Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

---

## 🧭 Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Update documentation when adding new features
- Write tests for new functionality

---

## 📄 License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

## 🙏 Acknowledgments

- CPU scheduling algorithms based on concepts from Operating System textbooks
- UI inspired by modern educational tools
- Thanks to all contributors for improving this project

---

## 📬 Contact

For questions or suggestions, open an issue on this repository or contact the maintainers directly.

**Note:** This project is created for educational purposes to help understand CPU scheduling algorithms. It may not reflect all the complexities of real-world OS schedulers.
