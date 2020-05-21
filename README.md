## Amazon ECS "Register Task Definition" Action for GitHub Actions

Registers an Amazon ECS task definition.

**Table of Contents**

<!-- toc -->

- [Amazon ECS "Register Task Definition" Action for GitHub Actions](#amazon-ecs-%22register-task-definition%22-action-for-github-actions)
- [Usage](#usage)
- [Credentials and Region](#credentials-and-region)
- [Permissions](#permissions)
- [License Summary](#license-summary)

<!-- tocstop -->

## Usage

```yaml
- name: Register to Amazon ECS
  uses: tarepan/amazon-ecs-register-task-definition@v2
  with:
    task-definition: task-definition.json
```

The action can be passed a `task-definition` generated dynamically via [the `aws-actions/amazon-ecs-render-task-definition` action](https://github.com/aws-actions/amazon-ecs-render-task-definition) or its derivative [the `tarepan/amazon-ecs-render-task-definition-env@v2` action](https://github.com/tarepan/amazon-ecs-render-task-definition-env).

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## Credentials and Region

This action relies on the [default behavior of the AWS SDK for Javascript](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) to determine AWS credentials and region.
Use [the `aws-actions/configure-aws-credentials` action](https://github.com/aws-actions/configure-aws-credentials) to configure the GitHub Actions environment with environment variables containing AWS credentials and your desired region.

## Permissions

This action requires the following minimum set of permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RegisterTaskDefinition",
      "Effect": "Allow",
      "Action": ["ecs:RegisterTaskDefinition"],
      "Resource": "*"
    },
    {
      "Sid": "PassRolesInTaskDefinition",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": [
        "arn:aws:iam::<aws_account_id>:role/<task_definition_task_role_name>",
        "arn:aws:iam::<aws_account_id>:role/<task_definition_task_execution_role_name>"
      ]
    }
  ]
}
```

Note: the policy above assumes the account has opted in to the ECS long ARN format.

## License Summary

This code is made available under the MIT license.
