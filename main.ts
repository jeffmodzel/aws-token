import { fromIni } from 'npm:@aws-sdk/credential-provider-ini@3.379.1';
import {
  IAMClient,
  ListMFADevicesCommand,
} from 'npm:@aws-sdk/client-iam@3.379.1';
import {
  GetSessionTokenCommand,
  GetSessionTokenCommandOutput,
  STSClient,
} from 'npm:@aws-sdk/client-sts@3.379.1';

//npm:<package-name>[@<version-requirement>][/<sub-path>]
//import { S3Client } from 'npm:@aws-sdk/client-s3@3.209.0'

//
// main
//
if (import.meta.main) {
  const debug=false;

  if (Deno.args.length < 2) {
    console.log('Usage: aws-token <profile> <token>');
    Deno.exit(1);
  }

  const profile = Deno.args[0];
  const token = Deno.args[1];
  const profileToken = `${profile}-token`;

  console.log(`Profile: ${profile}`);
  console.log(`Token: ${token}`);

  const credentials = fromIni({ profile: profile });
  const iam = new IAMClient({ credentials });
  const output = await iam.send(new ListMFADevicesCommand({}));

  if (!output) {
    console.log('ListMFADevices command returned null');
    Deno.exit(1);
  }

  if (debug) {
    console.log(output);
  }

  if (output!.MFADevices!.length == 0) {
    console.log('No MFA devices found');
    Deno.exit(1);
  }

  let serialNumber = '';
  if (output && output.MFADevices) {
    serialNumber = output!.MFADevices[0]!.SerialNumber as string;
  }

  const sts = new STSClient({ credentials });
  const tokenOutput = await sts.send(
    new GetSessionTokenCommand({
      DurationSeconds: 129600,
      SerialNumber: serialNumber,
      TokenCode: token,
    }),
  ) as GetSessionTokenCommandOutput;

  const creds = tokenOutput!.Credentials!;
  if (debug) {
    console.log(creds);
  }

  //
  // set the new credentials
  //
  const command1 = new Deno.Command('aws', {
    args: [
      'configure',
      'set',
      'aws_access_key_id',
      creds.AccessKeyId as string,
      '--profile',
      profileToken,
    ],
  });
  const output1 = await command1.output();
  if (output1.stderr && output1.stderr.length > 0) {
    console.log(new TextDecoder().decode(output1.stderr) + "***");
  }

  const command2 = new Deno.Command('aws', {
    args: [
      'configure',
      'set',
      'aws_secret_access_key',
      creds.SecretAccessKey as string,
      '--profile',
      profileToken,
    ],
  });
  const output2 = await command2.output();
  if (output2.stderr && output2.stderr.length > 0) {
    console.log(new TextDecoder().decode(output2.stderr));
  }

  const command3 = new Deno.Command('aws', {
    args: [
      'configure',
      'set',
      'aws_session_token',
      creds.SessionToken as string,
      '--profile',
      profileToken,
    ],
  });
  const output3 = await command3.output();
  if (output3.stderr && output3.stderr.length > 0) {
    console.log(new TextDecoder().decode(output3.stderr));
  }

  console.log(`Updated ${profileToken}, expires at ${creds.Expiration}`);
}
