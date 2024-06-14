/**
 * Making a new Project
 * Have a text file and keep watching it continuously
 * The target file will be written with commands as follows :-
 * 1. create a file <pathname>
 * ACTION : Create a file on required path
 * 2. Rename a file <oldname> <newname>
 * ACTION : Rename the file
 * 3. Write this to file <pathname> <content>
 * ACTION : Write to the file
 *
 */

const fs = require("fs/promises");

const targetFile = "./command.txt";
const CREATE_FILE = "create a file";
const RENAME_FILE = "rename the file";
const WRITE_FILE = "write to the file";

(async () => {
  const fileHandler = await fs.open(targetFile);
  fileHandler.on("change", async (filename) => {
    const { size } = await fs.stat(filename);
    const bufTarget = Buffer.alloc(size);
    const bufferOptions = {
      offset: 0,
      length: size,
      position: 0,
    };
    const { buffer, bytesRead } = await fileHandler.read(
      bufTarget,
      bufferOptions
    );

    const info = buffer.toString("utf-8");

    if (info.startsWith(CREATE_FILE)) {
      fileHandler.emit("create", buffer);
    } else if (info.startsWith(RENAME_FILE)) {
      fileHandler.emit("rename", buffer);
    } else if (info.startsWith(WRITE_FILE)) {
      fileHandler.emit("write", buffer);
    }
  });

  fileHandler.on("create", async (buffer) => {
    console.log("A request arrived to create a file");
    let fileHandler_target, filePath;
    try {
      const fileContent = buffer.toString("utf-8");
      filePath = fileContent.substring(CREATE_FILE.length + 1);
      fileHandler_target = await fs.open(filePath, "wx");
    } catch (error) {
      console.log(`The file already exists.`);
    } finally {
      if (!!fileHandler_target) {
        console.log(`${filePath} has been created successfully`);
        await fileHandler_target.close();
      }
    }
  });

  fileHandler.on("rename", async (buffer) => {
    console.log("A request arrived to rename a file");
    let oldFileHandler, newFileHandler;
    let oldPath, newPath;
    let isRenamed = false;
    try {
      const fileContent = buffer.toString("utf-8");
      const paths = fileContent.substring(RENAME_FILE.length + 1).split(" ");
      oldPath = paths[0];
      newPath = paths[1];
      oldFileHandler = await fs.open(oldPath, "r");
      newFileHandler = await fs.open(newPath, "r");
      if (!!newFileHandler) {
        throw Object.assign(new Error("DFAE"), {
          code: "DFAE",
          message: "Destination file already exists",
        });
      }
    } catch (e) {
      if (!!oldFileHandler && !!!newFileHandler) {
        await fs.rename(oldPath, newPath);
        isRenamed = true;
        return;
      }
      if (e.code === "ENOENT" || e.code === "DFAE") {
        console.log(`${e.message}`);
      }
    } finally {
      if (!!oldFileHandler) {
        if (isRenamed) {
          console.log("The file has been renamed successfully");
        }
        (await oldFileHandler).close();
      }

      if (!!newFileHandler) {
        await newFileHandler.close();
      }
    }
  });

  fileHandler.on("write", (buffer) => {
    console.log("A request arrived to write a file");
  });

  // Watching for the file changes...
  const watcher = await fs.watch(targetFile);
  let isWatching = false;
  for await (let event of watcher) {
    (() => {
      if (isWatching) return;
      isWatching = true;
      if (event.eventType === "change") {
        fileHandler.emit("change", event.filename);
      }
      setTimeout(() => {
        isWatching = false;
      }, 100);
    })();
  }
})();
