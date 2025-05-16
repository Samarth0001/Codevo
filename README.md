
Codevo is a cloud-native, real-time collaborative online IDE platform. It empowers users to instantly create, code, run, and preview applications in multiple programming environments — from frontend frameworks like React to backend runtimes such as Node.js, Python and C++. Users can collaborate seamlessly in real-time, sharing code and terminal access, all within a secure, scalable, and isolated environment.
<br/>

<h2>Key Features</h2>

1) Multi-language Template Support: Users can start new projects using predefined templates including C++, React, Express.js, Python and more.

2) Real-Time Collaborative Editor: Powered by Yjs and a custom WebSocket server, users can edit code simultaneously with low latency syncing.

3) Isolated Execution Environments: Each project runs inside a dedicated Kubernetes pod containing isolated containers, ensuring security and resource control.

4) Shell/Terminal Access in Browser: Integrated terminal powered by xterm.js and node-pty, allowing users to execute shell commands remotely and interact with their environment.

5) Persistent Storage: Project files are stored persistently on Cloudflare R2 object storage, ensuring durability and easy retrieval.

5) Autoscaling Kubernetes Cluster: Dynamically provisions pods and scales infrastructure based on active user demand.

6) Secure Architecture: Pods run with restricted permissions, resource limits, and isolated networking to protect system integrity.

<br/>
<h2>Architecture</h2>

<h3>High-Level Components</h3>


<br/>

**Frontend:**

- Interactive code editor with real-time collaboration using Yjs.

- Terminal emulator in-browser using xterm.js.

- User authentication with tokens, cookies, and bcrypt password hashing.

<br/>

**Storage:**

- Cloudflare R2 is used as object storage to keep:

- Base template code for each supported environment.

- User project files and ongoing changes, persisted for fault tolerance.

<br/>

**Backend & Kubernetes Cluster:**

- Nginx Ingress Controller handles incoming HTTP(S) traffic.

- A global ingress routes requests to the appropriate services.

- A reverse proxy routes user requests to the correct Kubernetes pod based on domain or path.

- For each new project creation:

  1) A dedicated Kubernetes pod is spawned containing two containers:
    - Runner Container: Executes user code, manages terminal I/O (ports 3000 and 3001).
    - Worker Container: Handles persistence and syncing with R2 storage, hides secrets (.env) from user access.<br/>
  2) A headless Kubernetes service exposes the pod internally for proxy routing.
 
<br/>


**Real-Time Collaboration:**

- Yjs library syncs document changes via a custom y-websocket server.

- Changes in the editor are:
    1) Immediately visible to all collaborators.
      
    2) Persisted to the pod's mounted /workspace volume.
      
    3) Pushed asynchronously to R2 by the worker container to ensure durability.

<br/>

**Terminal & Preview:**

- User shell input/output is proxied through socket.io on port 3000.

- Live preview of frontend/backend output served to user.

- Terminal access and code execution are sandboxed in the runner container, preventing unauthorized file access.

<br/>

<h3>Request Routing & Domain Strategy</h3>
Each project is identified by a unique projectId and served via a dynamic subdomain:

https://{projectId}.codevo.com
- Routing is handled by the ingress and reverse proxy.
- Reverse proxy based on the projectId, forwards request to k8s internal DNS resolver, which forwards request to correct pod.

<br/>
<h2>Challenges:</h2>

- Remote Code Execution: Running arbitrary user code safely requires strong sandboxing and isolation.

- Long-Running Processes: Unlike simple code runners, users expect persistent backend processes (e.g., servers) to stay alive.

- In-Browser Shell Access: Providing a live terminal accessible from the browser is non-trivial, demanding seamless bidirectional communication.

- Stateful Storage: User code changes must be saved reliably and synced across collaborators.

- Autoscaling Infrastructure: Efficiently managing many users with variable load requires dynamic resource scaling.

<br/>

<h2>Security & Scalability</h2>

- Pod Isolation: Each project runs in its own pod with restricted permissions and resource limits (e.g., capped CPUs, memory).

- Networking Isolation: Pods have private networking to avoid conflicts and exposure.

- Secret Management: Sensitive keys (e.g., R2 credentials) only exist in the worker container, inaccessible to the user’s code.

- Resource Autoscaling: The Kubernetes cluster automatically scales nodes based on workload, enabling seamless performance for many concurrent users.

- Restricted Access: Users cannot browse or tamper with sensitive files like .env due to container separation.
