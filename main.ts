import { fromIni } from "npm:@aws-sdk/credential-provider-ini@3.379.1";
import {
  IAMClient,
  ListMFADevicesCommand,
} from "npm:@aws-sdk/client-iam@3.379.1";
import {
  GetSessionTokenCommand,
  STSClient,
} from "npm:@aws-sdk/client-sts@3.379.1";

//npm:<package-name>[@<version-requirement>][/<sub-path>]
//import { S3Client } from 'npm:@aws-sdk/client-s3@3.209.0'

//
// main
//
if (import.meta.main) {
  if (Deno.args.length < 2) {
    console.log("Usage program.exe <profile> <token>");
  }

  const profile = Deno.args[0];
  const token = Deno.args[1];
  const profileToken = `${profile}-token`;

  console.log(`Profile: ${profile}`);
  console.log(`Token: ${token}`);
  console.log(`ProfileToken: ${profileToken}`);

  const credentials = fromIni({ profile: profile });
  const iam = new IAMClient({ credentials });
  let output = await iam.send(new ListMFADevicesCommand({}));

  if (!output) {
    console.log("ListMFADevices command returned null");
    Deno.exit(1);
  }

  console.log(output);

  if (output!.MFADevices!.length == 0) {
    console.log("No MFA devices found");
    Deno.exit(1);
  }

  const serialNumber = output!.MFADevices[0]!.SerialNumber;

  const sts = new STSClient({ credentials });
  output = await sts.send(
    new GetSessionTokenCommand({
      DurationSeconds: 129600,
      SerialNumber: serialNumber,
      TokenCode: token,
    }),
  );

  const creds = output!.Credentials!;
  console.log(creds);

  // const {stdout1, stderr1} = await exec(
  //   `aws configure set aws_access_key_id ${creds.AccessKeyId} --profile ${profileToken}`
  // );

  const command1 = new Deno.Command("aws", {
    args: [
      "configure",
      "set",
      "aws_access_key_id",
      creds.AccessKeyId,
      "--profile",
      profileToken,
    ],
  });
  const output1 = await command1.output();
  if (output1.stderr) {
    console.log(new TextDecoder().decode(output1.stderr));
  }

  // const {stdout2, stderr2} = await exec(
  //   `aws configure set aws_secret_access_key ${creds.SecretAccessKey} --profile ${profileToken}`
  // );
  let command = new Deno.Command("aws", {
    args: [
      "configure",
      "set",
      "aws_access_key_id",
      creds.AccessKeyId,
      "--profile",
      profileToken,
    ],
  });
  //{ stderr } = await command.output();

  // const {stdout3, stderr3} = await exec(
  //   `aws configure set aws_session_token ${creds.SessionToken} --profile ${profileToken}`
  // );

  //const { code, stdout, stderr } = await command.output();
  //console.log(new TextDecoder().decode(stdout));
  //console.log(new TextDecoder().decode(stderr));
  //output = command.outputSync();

  //console.log(output);
  //console.log(output.stdout);
}
