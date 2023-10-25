import {
    AmplifyProjectInfo,
    AmplifyS3ResourceTemplate,
} from "@aws-amplify/cli-extensibility-helper";
import { Fn, Stack, aws_lambda as lambda, aws_s3 as s3 } from "aws-cdk-lib";


export function override(
    resources: AmplifyS3ResourceTemplate,
    amplifyProjectInfo: AmplifyProjectInfo
) {
    // @ts-ignore
    const stack = Stack.of(resources);
    const stackName = Fn.ref("AWS::StackName");
    const splitStackName = Fn.split("-", stackName);
    const fourthElement = Fn.select(3, splitStackName);

    const bucketNameRef = Fn.ref("bucketName");
    const envRef = Fn.ref("env");

    const finalJoin = Fn.join("", [
        "arn:aws:s3:::",
        bucketNameRef,
        fourthElement,
        "-",
        envRef,
    ]);

    const objectsArnJoin = Fn.join("", [
        "arn:aws:s3:::",
        bucketNameRef,
        fourthElement,
        "-",
        envRef,
        "/*",
    ]);

    const cfnPermission = new lambda.CfnPermission(
        // ignore stack type error
        // @ts-ignore
        stack,
        "PhotoTriggerLambdaTriggerPermission",
        {
            action: "lambda:InvokeFunction",
            functionName: `photoTrigger-${envRef}`,
            principal: "s3.amazonaws.com",
            sourceAccount: stack.account,
            sourceArn: finalJoin,
        }
    );
    // @ts-ignore
    resources.s3Bucket.addDependency(cfnPermission);

    // Lambda trigger configurations
    resources.s3Bucket.notificationConfiguration = {
        lambdaConfigurations: [
            {
                event: "s3:ObjectCreated:*",
                function: `arn:aws:lambda:${stack.region}:${stack.account}:function:videoTrigger-${envRef}`,
                filter: {
                    s3Key: {
                        rules: [
                            {
                                name: "suffix",
                                value: ".mp4",
                            },
                        ],
                    },
                },
            },
            {
                event: "s3:ObjectCreated:*",
                function: `arn:aws:lambda:${stack.region}:${stack.account}:function:photoTrigger-${envRef}`,
                filter: {
                    s3Key: {
                        rules: [
                            {
                                name: "prefix",
                                value: "Video/Images",
                            },
                            {
                                name: "suffix",
                                value: ".jpg",
                            },
                        ],
                    },
                },
            },
        ],
    };
}