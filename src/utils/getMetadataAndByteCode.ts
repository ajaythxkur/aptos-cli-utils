import fs from "fs"
import path from "path";
import { spawnSync } from "child_process";
import { nodeEnv } from "./env";
import { Chain } from "../controllers/publish-package-controller";

const commandOptions = { maxBuffer: 1024 * 1024 * 10 }

export async function getMetadataAndByteCode(
  chain: Chain,
  chainId: number,
  module_address: string,
  name: string,
  symbol: string,
  image: string,
  description: string,
  telegram: string | undefined,
  twitter: string | undefined,
  website: string | undefined,
  max_aptos: number | undefined,
  min_coins: number | undefined,
) {
  if (chain === "supra") {
    return supraPackageBuilder(
      chainId,
      module_address,
      name,
      symbol,
      image,
      description,
      telegram,
      twitter,
      website,
      max_aptos,
      min_coins,
    )
  }
  let aptos = "npx aptos";
  if (chain === "movement") {
    aptos = "movement"
  }

  const SYMBOL = symbol.toUpperCase();
  const dirName = `${symbol}-${chain}-${Date.now()}`;
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

    const newFile = path.join(dirPath, "sources/coin.move");
    const code = getCode(
      name,
      SYMBOL,
      image,
      description,
      telegram,
      twitter,
      website,
      max_aptos,
      min_coins
    );
    console.log({chain, code})

    if (!fs.existsSync(path.dirname(newFile))) {
      fs.mkdirSync(path.dirname(newFile), { recursive: true });
      console.log(`Created directories: ${path.dirname(newFile)}`);
    }
    if (chain === "movement") {
      const moveTomlFile = path.join(dirPath, "Move.toml");
      if (fs.existsSync(newFile)) {
        fs.unlinkSync(newFile);
        console.log(`Deleted file: ${newFile}`);
      }
      fs.writeFileSync(moveTomlFile, getMoveTomlForMovement(module_address, chainId), "utf-8");
    }
    if (chain === "aptos") {
      const moveTomlFile = path.join(dirPath, "Move.toml");
      if (fs.existsSync(newFile)) {
        fs.unlinkSync(newFile);
        console.log(`Deleted file: ${newFile}`);
      }
      fs.writeFileSync(moveTomlFile, getMoveTomlForAptos(module_address, chainId), "utf-8");
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

function supraPackageBuilder(
  chainId: number,
  module_address: string,
  name: string,
  symbol: string,
  image: string,
  description: string,
  telegram: string | undefined,
  twitter: string | undefined,
  website: string | undefined,
  max_aptos: number | undefined,
  min_coins: number | undefined,
) {
  const dirName = `${symbol}-supra-${Date.now()}`;
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

    const newFile = path.join(dirPath, "sources/coin.move");
    const code = getCode(
      name,
      SYMBOL,
      image,
      description,
      telegram,
      twitter,
      website,
      max_aptos,
      min_coins
    );
    console.log({chain: "supra", code})
    if (!fs.existsSync(path.dirname(newFile))) {
      fs.mkdirSync(path.dirname(newFile), { recursive: true });
      console.log(`Created directories: ${path.dirname(newFile)}`);
    }

    const moveTomlFile = path.join(dirPath, "Move.toml");
    if (fs.existsSync(newFile)) {
      fs.unlinkSync(newFile);
      console.log(`Deleted file: ${newFile}`);
    }
    fs.writeFileSync(moveTomlFile, getMoveTomlForSupra(module_address, chainId), "utf-8");
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

function getCode(
  name: string,
  symbol: string,
  image: string,
  description: string,
  telegram: string | undefined,
  twitter: string | undefined,
  website: string | undefined,
  max_aptos: number | undefined,
  min_coins: number | undefined
) {
  const formattedName = name
    .toLowerCase()
    .split(" ")
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
  return `
        module addrx::${formattedName} {
            use std::string;
            use std::option;

            struct PUMP_${symbol} has key {} 

            struct ${symbol} has key {}

            fun init_module(module_signer: &signer) {
                pump::pump::${min_coins ? `create_and_buy` : `create`}<PUMP_${symbol},${symbol}>(
                    module_signer,
                    string::utf8(b"${name}"),
                    string::utf8(b"${symbol}"),
                    string::utf8(b"${image}"),
                    string::utf8(b"${description}"),
                    ${telegram ? `option::some(string::utf8(b"${telegram}"))` : `option::none()`},
                    ${twitter ? `option::some(string::utf8(b"${twitter}"))` : `option::none()`},
                    ${website ? `option::some(string::utf8(b"${website}"))` : `option::none()`},
                    ${max_aptos ? `${max_aptos},` : ``}
                    ${min_coins ? `${min_coins},` : ``}
                );
            }
        }
    `
}

function getMoveTomlForMovement(module_addr: string, chainId: number) {
  return `
    [package]
    name = "token-${Date.now()}"
    version = "1.0.0"
    authors = []

    [addresses]
    addrx="${module_addr}"

    [dev-addresses]

    [dependencies]
    AptosFramework = { git = "https://github.com/movementlabsxyz/aptos-core.git", rev = "movement", subdir = "aptos-move/framework/aptos-framework" }

    [dependencies.pump]
    git = "https://github.com/Meowtos/integrate-pump.git"
    rev = "main"
    subdir = "${chainId === 126 ? `movement_mainnet_interface` : `movement_testnet_interface`}"

    [dev-dependencies]
  `
}

function getMoveTomlForAptos(module_addr: string, chainId: number) {
  return `
    [package]
    name = "token-${Date.now()}"
    version = "1.0.0"
    authors = []

    [addresses]
    addrx="${module_addr}"

    [dev-addresses]

    [dependencies.AptosFramework]
    git = "https://github.com/aptos-labs/aptos-framework.git"
    rev = "mainnet"
    subdir = "aptos-framework"

    [dependencies.pump]
    git = "https://github.com/Meowtos/integrate-pump.git"
    rev = "main"
    subdir = "${chainId === 1 ? `aptos_mainnet_interface` : `aptos_testnet_interface`}"

    [dev-dependencies]
  `
}

function getMoveTomlForSupra(module_addr: string, chainId: number) {
  return `
    [package]
    name = "token-${Date.now()}"
    version = "1.0.0"
    authors = []

    [addresses]
    addrx="${module_addr}"

    [dev-addresses]

    [dependencies.SupraFramework]
    git = "https://github.com/Entropy-Foundation/aptos-core.git"
    rev = "dev"
    subdir = "aptos-move/framework/supra-framework"

    [dependencies.pump]
    git = "https://github.com/Meowtos/integrate-pump.git"
    rev = "main"
    subdir = "${chainId === 8 ? `supra_mainnet_interface` : `supra_testnet_interface`}"

    [dev-dependencies]
  `
}