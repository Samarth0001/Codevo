<br/>
Codevo is a real-time collaborative cloud IDE that enables developers to instantly create, edit, and run projects across multiple programming environments from frontend frameworks like React to backend runtimes such as Node.js. The platform supports seamless multi-user collaboration, allowing teams to share code, terminal access, and live previews in real time. With secure sandboxed execution, persistent storage, and scalable Kubernetes infrastructure, Codevo ensures a safe, reliable, and high-performance development experience for individuals and teams alike.
<br/>

<h2>Key Features</h2>

1) Multi-Template Project Support: Users can create and manage new projects using predefined templates including React and Node.js, providing flexibility for both frontend and backend development.

2) Real-Time Collaborative Editor: Built using Socket.IO, the platform enables seamless real-time code collaboration. Multiple users can edit files simultaneously with instant synchronization and minimal latency.

3) Isolated Execution Environments: Every project runs inside a dedicated Docker container orchestrated via GKE (Google Kubernetes Engine), ensuring secure and sandboxed code execution with controlled resource usage.

4) Browser-Based Terminal Access: Integrated with xterm.js and node-pty, users can execute shell commands directly within the browser, providing a native terminal experience without local setup.

5) AI-Powered Coding Assistant: A built-in LLM-based assistant helps developers write, debug, and enhance code. It can generate code snippets, explain selected blocks, and suggest optimizations — improving productivity by up to 40%.

6) GitHub Integration with Version Control: Users can commit, push, pull, and sync their projects directly from the IDE. This enables a seamless workflow between local repositories and the collaborative cloud environment.

7) Persistent Cloud Storage: All project data is stored securely on Cloudflare R2 (AWS S3-compatible) object storage, ensuring reliability, durability, and fast retrieval.

8) Autoscaling Kubernetes Infrastructure: The platform dynamically provisions Kubernetes pods based on workload demand, maintaining >99.9% uptime and reducing resource overhead.

9) Secure and Self-Healing Architecture: Each container runs with restricted permissions and isolated networking. GKE’s self-healing mechanisms automatically recover failed pods, ensuring consistent and safe execution.

10) Role-Based Collaboration Access: Supports Editor and Viewer roles, allowing controlled collaboration and permission management across team members.
  
11) Automated Resource Cleanup via Redis Pub/Sub: Active project sessions are tracked through Redis Pub/Sub channels. If a project remains inactive for 10 minutes, the server automatically cleans up containers and releases resources, optimizing cluster performance and cost efficiency.

<br/>

<h2>Tech Stack</h2>
<h3>Frontend</h3>

- React.js
- TypeScript
- Tailwind CSS
- Socket.IO
- xterm.js

<h3>Backend</h3>

- Express.js
- TypeScript
- Socket.IO
- Redis (Pub/Sub)
- Node-PTY
- JWT & Bcrypt

<h3>Realtime Collaboration</h3>

- Socket.IO

<h3>Database & Storage</h3>

- MongoDB
- Cloudflare R2 (AWS S3 SDK)

<h3>Infrastructure & DevOps</h3>

- Docker
- Kubernetes (K8s)
- Nginx Ingress Controller
- Cloudflare: Provides DNS management
- Let’s Encrypt – SSL certificate issuance for secure HTTPS communication

<br/>

<h2>Architecture</h2>
<img width="1640" height="648" alt="image" src="https://github.com/user-attachments/assets/a51060f5-d3cc-4d6b-a52e-446f28ac70a8" />


<h3>High-Level Components</h3>

<h4>Frontend:</h4>

- Deployed on Vercel, ensuring fast global access and optimal performance.

- Features a fully interactive code editor supporting real-time collaboration through Socket.IO — multiple users can edit the same file simultaneously with instant synchronization.

- Integrated AI coding assistant powered by Google Gemini 2.5, capable of generating code, fixing bugs, explaining code snippets, and suggesting improvements directly within the IDE.

- Interactive file explorer that allows users to create, rename, delete, and organize files and folders with an intuitive interface.

- Built-in GitHub integration for version control — users can commit, push, pull, and view change history directly from the interface.

- Ability to invite collaborators with role-based permissions (Editor/Viewer) for team projects.

- Browser-based terminal powered by xterm.js and node-pty, enabling shell command execution within the IDE.

- Real-time live preview panel that displays running React or Node.js applications instantly as the code updates.

- Secure authentication with JWT tokens, cookies, and bcrypt for safe login and session handling.

<br/>

<h4>Storage:</h4>

The platform uses a combination of MongoDB Atlas and Cloudflare R2 for data persistence and reliability.
<br/>

**MongoDB Atlas**

Acts as the primary database for storing application metadata and user-related information, including:

- User profiles and authentication data

- Project metadata and collaborator details

- GitHub account links and OAuth tokens

- Chat sessions for AI assistant interactions

- Invitations and role-based access information

- Template metadata for supported environments (React, Node.js, etc.)


**Cloudflare R2 (S3-Compatible Object Storage)**

Serves as the persistent file storage layer for user's project code.

Stores:
- Base template code for each supported runtime (React, Node.js, etc.)

- User project files and code.

<br/>

<h4>Backend & Kubernetes Cluster:</h4>

- Backend services, Redis, and all project environments run inside a GKE (Google Kubernetes Engine) cluster for scalability and reliability.

- NGINX Ingress Controller handles all incoming HTTP(S) traffic. Requests to api.codevo.dev are routed to the correct backend service or project environment through internal ingress rules.

- When a user creates or opens a project, the backend dynamically provisions three Kubernetes resources:

  1) Pod – Isolated runtime environment for the project.

  2) Service – Internal communication bridge between containers.

  3) Ingress – Exposes the project’s preview server publicly for live access.

- Each project pod contains three specialized containers:

  1) Init Container – A temporary container which fetches project code (existing or base template) from Cloudflare R2, mounts it to a shared volume, and prepares the workspace for execution.

  2) Runner Container – Core of the IDE environment. Handles:

    - Real-time collaboration and WebSocket communication

    - Code execution and live previews (via Vite for React or Node.js servers)

    - GitHub operations and workspace updates

  3) Worker Container – Continuously monitors file changes and syncs updated code back to Cloudflare R2 using a debounced mechanism to optimize network and write operations.

- Once the environment is ready, a direct WebSocket connection is established between the user(s) and the runner container, enabling smooth, low-latency collaboration, live editing, and real-time preview.

- Additionally, a Redis Pub/Sub system monitors active projects. If a project remains inactive for 10 minutes, the backend automatically cleans up its associated Kubernetes resources (pod, service, and ingress), ensuring efficient resource utilization across the cluster.
 
<br/>


<h4>Terminal & Preview:</h4>

- User shell input and output are proxied through Socket.IO communication channels, allowing real-time command execution directly in the browser.

- Terminal sessions are fully sandboxed within the runner container, ensuring secure and isolated code execution without access to unauthorized system files.

- The runner container also manages the live preview server, automatically launching either:

    a) Vite development server (for React template), or

    b) Node.js server (for Node.js template).

- The live preview is accessible through a public URL exposed by the pod’s ingress resource, allowing users to view their app output instantly as they code

<br/>

<h3>Request Routing & Domain Strategy</h3>

<p>Each user project is identified by a unique <code>projectId</code> and is served through a dynamic subdomain:</p>

<pre><code>https://{projectId}.codevo.dev</code></pre>

<ul>
  <li><strong>NGINX Ingress Controller</strong> handles all incoming HTTP(S) traffic within the GKE cluster.</li>
  <li>Requests to <code>api.codevo.dev</code> are routed to the main backend service.</li>
  <li>For each active project, the backend automatically creates a <strong>dedicated ingress resource</strong>.</li>
  <li>The ingress uses the project’s subdomain (<code>{projectId}.codevo.dev</code>) to route traffic directly to the corresponding <strong>project service</strong>, which internally points to the correct <strong>project pod</strong>.</li>
  <li>This approach eliminates the need for an external reverse proxy — all routing logic is handled natively by Kubernetes ingress rules and internal DNS resolution.</li>
</ul>


<br/>
<h3>Challenges</h3>
<ul>
  <li><strong>Remote Code Execution:</strong> Running arbitrary user code safely requires strong sandboxing and isolation.</li>
  <li><strong>Long-Running Processes:</strong> Users expect persistent backend processes (e.g., servers) to stay alive, unlike simple code runners.</li>
  <li><strong>In-Browser Shell Access:</strong> Providing a live terminal in the browser requires seamless bidirectional communication.</li>
  <li><strong>Real-Time Collaboration:</strong> Managing multiple users editing the same files simultaneously with low-latency sync and conflict resolution.</li>
  <li><strong>Stateful Storage:</strong> User code changes must be reliably saved and synced across collaborators.</li>
  <li><strong>Autoscaling Infrastructure:</strong> Efficiently managing variable workloads for many users requires dynamic scaling of pods and nodes.</li>
  <li><strong>AI Integration:</strong> Providing AI-powered code suggestions (Gemini 2.5) while keeping sensitive project data secure.</li>
  <li><strong>Resource Cleanup:</strong> Detecting inactive projects via Redis Pub/Sub and automatically cleaning up associated resources to optimize cluster performance.</li>
</ul>
<br/>

<h3>Security & Scalability</h3>
<ul>
  <li><strong>Pod Isolation:</strong> Each project runs in its own pod with restricted permissions and resource limits (CPU, memory).</li>
  <li><strong>Networking Isolation:</strong> Pods have private networking to avoid conflicts and exposure to other users.</li>
  <li><strong>Secret Management:</strong> Sensitive keys (e.g., R2 credentials) exist only in the worker container and are inaccessible to user code.</li>
  <li><strong>Restricted Access:</strong> Users cannot access or modify sensitive files like <code>.env</code> due to container separation.</li>
  <li><strong>Resource Autoscaling:</strong> The Kubernetes cluster automatically scales nodes and pods based on workload, ensuring smooth performance for many concurrent users.</li>
  <li><strong>Data Consistency:</strong> Changes from the runner container are synced to Cloudflare R2 via debounced updates to prevent data loss or conflicts.</li>
  <li><strong>HTTPS & Security:</strong> All project subdomains use SSL/TLS certificates managed with <strong>Let’s Encrypt</strong>, ensuring secure connections.</li>
</ul>

