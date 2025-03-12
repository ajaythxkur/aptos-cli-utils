import fs from "fs"
import path from "path";
import { spawnSync } from "child_process";
import { nodeEnv } from "./env";
import { Chain } from "../controllers/publish-package-controller";

const commandOptions = { maxBuffer: 1024 * 1024 * 10 }

function getMoveTomlForMovement(packageName: string) {
  return `[package]
    name = "${packageName}"
    version = "1.0.0"
    authors = []

    [dependencies]
    AptosFramework = { git = "https://github.com/movementlabsxyz/aptos-core.git", rev = "movement", subdir = "aptos-move/framework/aptos-framework" }
  `
}

export async function getMetadataAndByteCode(
  module_address: string,
  symbol: string,
  chain: Chain
) {
  if (chain === "supra") {
    return supraPackageBuilder(module_address, symbol)
  }
  let aptos = "npx aptos";
  if (chain === "movement") {
    aptos = "movement"
  }

  const SYMBOL = symbol.toUpperCase();
  const dirName = `coin-${module_address}-${symbol.toLowerCase()}-${chain}`;
  let metadataBytes = "";
  let byteCode: string[] = [];

  const cwd = process.cwd();
  const moveStructsPath = path.join(cwd, nodeEnv === "development" ? "src/move-structs" : "dist/move-structs");
  if (!fs.existsSync(moveStructsPath)) {
    fs.mkdirSync(moveStructsPath, { recursive: true }); // `recursive` ensures that nested directories are created
    console.log(`Move structs directory created at aptos/movement paths`);
  }

  let dirPath = path.join(moveStructsPath, dirName);

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const initCommand = aptos.split(" ")[0];
    const initArgs = aptos.split(" ").slice(1).concat([
      "move",
      "init",
      "--name",
      dirName,
      "--assume-yes"
    ]);

    const initResult = spawnSync(initCommand, initArgs, {
      cwd: dirPath, // Set the working directory
      stdio: "inherit", // Stream output directly to console
      shell: true, // Enable shell execution
    });

    if (initResult.error) {
      throw new Error(`Failed to execute init command: ${initResult.error.message}`);
    }

    const newFile = path.join(dirPath, "sources/newCoin.move");
    const code = `module ${module_address}::${SYMBOL} { struct ${SYMBOL} has key {} }`;

    if (!fs.existsSync(path.dirname(newFile))) {
      fs.mkdirSync(path.dirname(newFile), { recursive: true });
      console.log(`Created directories: ${path.dirname(newFile)}`);
    }
    if (chain === "movement") {
      const moveTomlFile =  path.join(dirPath, "Move.toml");
      if (fs.existsSync(newFile)) {
        fs.unlinkSync(newFile);
        console.log(`Deleted file: ${newFile}`);
      }
      fs.writeFileSync(moveTomlFile, getMoveTomlForMovement(dirName), "utf-8");
    }
    // Attempt to write the file
    fs.writeFileSync(newFile, code, "utf8",);

    if (fs.existsSync(newFile)) {
      console.log(`File successfully written to: ${newFile}`);
    } else {
      console.error(`File write failed. File does not exist at: ${newFile}`);
    }
    const commandArgs = [
      `cd ${dirPath} &&`,
      `${aptos} move build-publish-payload`,
      `--json-output-file sources/metadata.json`,
      `--assume-yes`,
      `--sender-account ${module_address}`
    ].filter(Boolean).join(' '); // Combining all parts of the command

    // Execute the command synchronously using spawnSync
    const result = spawnSync(commandArgs, {
      shell: true,        // Use shell to properly handle 'cd' and chained commands
      cwd: dirPath,      // Set the working directory
      stdio: 'inherit',   // Inherit standard input/output (show command output in console)
      ...commandOptions  // Include command options like maxBuffer, etc.
    });

    if (result.error) {
      console.error('Error executing command:', result.error);
    }
    const metadataFilePath = path.join(dirPath, "sources/metadata.json");
    if (!fs.existsSync(metadataFilePath)) {
      throw new Error("metadata.json not found after execution");
    }
    const data = getPackageBytesToPublish(
      metadataFilePath
    )
    metadataBytes = data.metadataBytes;
    byteCode = data.byteCode
  } catch (error: any) {
    throw new Error(error.message)
  } finally {
    fs.rm(
      dirPath,
      { recursive: true, force: true },
      (err) => {
        if (err) {
          return console.error("Error deleting directory:", err);
        }
      }
    );
  }
  return { metadataBytes, byteCode }
}

function getPackageBytesToPublish(modulePath: string) {
  const jsonData = JSON.parse(fs.readFileSync(modulePath, "utf8"));
  const metadataBytes = jsonData.args[0].value;
  const byteCode = jsonData.args[1].value;
  return { metadataBytes, byteCode };
}

function supraPackageBuilder(module_address: string, symbol: string) {
  const dirName = `coin-${module_address}-${symbol.toLowerCase()}-supra`;
  const supra = "docker exec -i supra_cli /supra/supra";
  const packageDir = "/supra/configs/move_workspace/" + dirName;

  const SYMBOL = symbol.toUpperCase();
  let metadataBytes = "";
  let byteCode: string[] = [];
  let parentDir = path.join(__dirname, "../../../");
  if (nodeEnv === "development") {
    parentDir = path.join(__dirname, "../../../..");
  }
  console.log({ parentDir })
  const dirPath = path.join(parentDir, "supra/configs/move_workspace", dirName);
  console.log({ dirPath })
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const initCommand = supra.split(" ")[0];
    const initArgs = supra.split(" ").slice(1).concat([
      "move tool",
      "init",
      "--name",
      `${dirName}`,
      "--assume-yes",
      `--package-dir ${packageDir}`,
    ]);

    const initResult = spawnSync(initCommand, initArgs, {
      cwd: dirPath, // Set the working directory
      stdio: "inherit", // Stream output directly to console
      shell: true, // Enable shell execution
    });

    if (initResult.error) {
      throw new Error(`Failed to execute init command: ${initResult.error.message}`);
    }

    const newFile = path.join(dirPath, "sources/newCoin.move");
    const code = `module ${module_address}::${SYMBOL} { struct ${SYMBOL} has key {} }`;
    if (!fs.existsSync(path.dirname(newFile))) {
      fs.mkdirSync(path.dirname(newFile), { recursive: true });
      console.log(`Created directories: ${path.dirname(newFile)}`);
    }
    // Attempt to write the file
    fs.writeFileSync(newFile, code, "utf8",);

    if (fs.existsSync(newFile)) {
      console.log(`File successfully written to: ${newFile}`);
    }
    const commandArgs = [
      `${supra} move tool build-publish-payload`,
      `--json-output-file /supra/configs/move_workspace/${dirName}/sources/metadata.json`,
      `--assume-yes`,
      `--package-dir ${packageDir}`,
    ].filter(Boolean).join(' '); // Combining all parts of the command

    // Execute the command synchronously using spawnSync
    const result = spawnSync(commandArgs, {
      shell: true,        // Use shell to properly handle 'cd' and chained commands
      cwd: dirPath,      // Set the working directory
      stdio: 'inherit',   // Inherit standard input/output (show command output in console)
      ...commandOptions  // Include command options like maxBuffer, etc.
    });

    if (result.error) {
      console.error('Error executing command:', result.error);
    }

    const metadataFilePath = path.join(dirPath, "sources/metadata.json");
    console.log({ metadataFilePath })
    if (!fs.existsSync(metadataFilePath)) {
      throw new Error("metadata.json not found after execution");
    }
    const data = getPackageBytesToPublish(
      metadataFilePath
    )
    metadataBytes = data.metadataBytes;
    byteCode = data.byteCode;

  } catch (error: any) {
    throw new Error(error.message)
  } finally {
    fs.rm(
      dirPath,
      { recursive: true, force: true },
      (err) => {
        if (err) {
          return console.error("Error deleting directory:", err);
        }
      }
    );
  }
  return { metadataBytes, byteCode };
}

