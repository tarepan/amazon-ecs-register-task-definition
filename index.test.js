const run = require(".");
const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

jest.mock("@actions/core");
jest.mock("fs");

const mockEcsRegisterTaskDef = jest.fn();
jest.mock("aws-sdk", () => {
  return {
    config: {
      region: "fake-region",
    },
    ECS: jest.fn(() => ({
      registerTaskDefinition: mockEcsRegisterTaskDef,
    })),
  };
});

describe("Register to ECS", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    core.getInput = jest.fn().mockReturnValueOnce("task-definition.json"); // task-definition

    process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });

    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      if (
        pathInput == path.join(process.env.GITHUB_WORKSPACE, "appspec.yaml")
      ) {
        return `
                Resources:
                - TargetService:
                    Type: AWS::ECS::Service
                    Properties:
                      TaskDefinition: helloworld
                      LoadBalancerInfo:
                        ContainerName: web
                        ContainerPort: 80`;
      }

      if (
        pathInput ==
        path.join(process.env.GITHUB_WORKSPACE, "task-definition.json")
      ) {
        return JSON.stringify({ family: "task-def-family" });
      }

      throw new Error(`Unknown path ${pathInput}`);
    });

    mockEcsRegisterTaskDef.mockImplementation(() => {
      return {
        promise() {
          return Promise.resolve({
            taskDefinition: { taskDefinitionArn: "task:def:arn" },
          });
        },
      };
    });
  });

  test("registers the task definition contents", async () => {
    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family",
    });
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "task-definition-arn",
      "task:def:arn"
    );
  });

  test("cleans null keys out of the task definition contents", async () => {
    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      return '{ "ipcMode": null, "family": "task-def-family" }';
    });

    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family",
    });
  });

  test("cleans empty arrays out of the task definition contents", async () => {
    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      return '{ "tags": [], "family": "task-def-family" }';
    });

    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family",
    });
  });

  test("cleans empty strings and objects out of the task definition contents", async () => {
    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      return `
            {
                "memory": "",
                "containerDefinitions": [ {
                    "name": "sample-container",
                    "logConfiguration": {},
                    "repositoryCredentials": { "credentialsParameter": "" },
                    "command": [
                        ""
                    ],
                    "environment": [
                        {
                            "name": "hello",
                            "value": "world"
                        },
                        {
                            "name": "",
                            "value": ""
                        }
                    ],
                    "secretOptions": [ {
                        "name": "",
                        "valueFrom": ""
                    } ],
                    "cpu": 0,
                    "essential": false
                } ],
                "requiresCompatibilities": [ "EC2" ],
                "family": "task-def-family"
            }
            `;
    });

    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family",
      containerDefinitions: [
        {
          name: "sample-container",
          cpu: 0,
          essential: false,
          environment: [
            {
              name: "hello",
              value: "world",
            },
          ],
        },
      ],
      requiresCompatibilities: ["EC2"],
    });
  });

  test("cleans invalid keys out of the task definition contents", async () => {
    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      return '{ "compatibilities": ["EC2"], "taskDefinitionArn": "arn:aws...:task-def-family:1", "family": "task-def-family", "revision": 1, "status": "ACTIVE" }';
    });

    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family",
    });
  });

  test("registers the task definition contents at an absolute path", async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce("/hello/task-definition.json");
    fs.readFileSync.mockImplementation((pathInput, encoding) => {
      if (encoding != "utf8") {
        throw new Error(`Wrong encoding ${encoding}`);
      }

      if (pathInput == "/hello/task-definition.json") {
        return JSON.stringify({ family: "task-def-family-absolute-path" });
      }

      throw new Error(`Unknown path ${pathInput}`);
    });

    await run();
    expect(core.setFailed).toHaveBeenCalledTimes(0);

    expect(mockEcsRegisterTaskDef).toHaveBeenNthCalledWith(1, {
      family: "task-def-family-absolute-path",
    });
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "task-definition-arn",
      "task:def:arn"
    );
  });

  test("error is caught if task def registration fails", async () => {
    mockEcsRegisterTaskDef.mockImplementation(() => {
      throw new Error("Could not parse");
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledTimes(2);
    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      "Failed to register task definition in ECS: Could not parse"
    );
    expect(core.setFailed).toHaveBeenNthCalledWith(2, "Could not parse");
  });
});
