export const getRunnerUrl = (projectId: string) => `http://${projectId}:3000`;
// For external access via Ingress, you could use:
// export const getRunnerUrl = (projectId: string) => `https://${projectId}.codevo.live`;


