import { Request, Response } from 'express';
import fs from "fs";
import yaml from "yaml";
import path from "path";
// import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";


interface CreateProjectRequestBody {
    uniqueId: string;
  }

export const createProject = async(req: Request, res: Response): Promise<void> => {
    // Dynamic import for CommonJS compatibility
    const { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } = await import("@kubernetes/client-node");

    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromDefault();
    const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
    const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
    const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

    // Updated utility function to handle multi-document YAML files
    const readAndParseKubeYaml = (filePath: string, projectId: string): Array<any> => {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
            let docString = doc.toString();
            const regex = new RegExp(`service_name`, 'g');
            docString = docString.replace(regex, projectId);
            console.log(docString);
            return yaml.parse(docString);
        });
        return docs;
    };  
      
    const { uniqueId} = req.body as CreateProjectRequestBody; // Assume a unique identifier for each user
    const namespace = "default"; // Assuming a default namespace, adjust as needed

    try {
        const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), uniqueId);
        for (const manifest of kubeManifests) {
            switch (manifest.kind) {
                case "Deployment":
                    // await appsV1Api.createNamespacedDeployment(namespace, manifest);
                    await appsV1Api.createNamespacedDeployment({
                        namespace,
                        body: manifest
                      });
                      
                    break;
                case "Service":
                    // await coreV1Api.createNamespacedService(namespace, manifest);
                    await coreV1Api.createNamespacedService({
                        namespace,
                        body: manifest
                      });
                      
                    break;
                case "Ingress":
                    await networkingV1Api.createNamespacedIngress({
                        namespace,
                        body: manifest
                    });
                    break;
                default:
                    console.log(`Unsupported kind: ${manifest.kind}`);
            }
        }
        res.status(200).send({ message: "Resources created successfully" });
    } catch (error) {
        console.error("Failed to create resources", error);
        res.status(500).send({ message: "Failed to create resources" });
    }
}