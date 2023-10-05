#!/usr/bin/env zx
// https://github.com/google/zx
// zx ./script.mjs

import { readdir, readFile, writeFile } from "fs/promises";

cd("../");

let { name } = await fs.readJson("./package.json");
console.log(`Migrando ${name} a Nuxt 3...`);

const removeAllDsStore = async () => {
  try {
    await $`find . -name ".DS_Store" -delete`;
  } catch (error) {
    console.error("Error", error)
  }
}

// Borrado de paquetes y archivos
const deletePkg = async () => {
  const listDelete = [
    { name: "yarn.lock", type: "file" },
    { name: "package-lock.json", type: "file" },
    { name: "node_modules", type: "folder" },
    { name: ".nuxt", type: "folder" },
    { name: "dist", type: "folder" }
  ];
  for (const file of listDelete) {
    try {
      if (file.type === "folder") {
        await $`rm -r ${file.name}`;
      } else {
        await $`rm ${file.name}`;
      }
    } catch (error) {
      console.error("Error", error)
    }
  }
};

// Crear backup de archivos y carpetas
const folderBackup = async () => {
  try {
    await $`mkdir ./.nuxt-old/backup/`;
  } catch (error) {
    console.error("Error", error)
  }

  const listBackup = [
    { name: "plugins", type: "folder" },
    { name: "middleware", type: "folder" },
    { name: "store", type: "folder" },
    { name: "nuxt.config.js", type: "file" },
    { name: "package.json", type: "file" }
  ];
  for (const file of listBackup) {
    try {
      if (file.type === "folder") {
        await $`cp -R ${file.name} ./.nuxt-old/backup/${file.name}`;
      } else {
        await $`cp ${file.name} ./.nuxt-old/backup/${file.name}`;
        await $`mv ./.nuxt-old/backup/${file.name} ./.nuxt-old/backup/old.${file.name}`;
      }
    } catch (error) {
      console.error("Error", error)
    }
  }
};

// Creación de carpeta de tipado
const folderType = async () => {
  try {
    await $`mkdir types`;
    await $`touch types/index.d.ts`;
    const constentType = `interface PluginsInjections {}

declare module '#app' {
  interface NuxtApp extends PluginsInjections {}
}

declare module 'nuxt/dist/app/nuxt' {
  interface NuxtApp extends PluginsInjections {}
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends PluginsInjections {}
}
`;
    await writeFile("types/index.d.ts", constentType);
    console.log("Archivo creado exitosamente!");
  } catch (error) {
    console.error("Error", error);
  }
};

// Instalación de paquetes
const installPkg = async () => {
  const newPackage = `{
  "name": "${name}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nuxi build",
    "dev": "nuxi dev",
    "generate": "nuxi generate",
    "preview": "nuxi preview",
    "start": "nuxi start"
  },
  "devDependencies": {},
  "dependencies": {}
}`;

  await writeFile("package.json", newPackage);
  const devDependencies = [
    "nuxt",
    "nuxt-icon",
    "@nuxt/devtools",
    "@nuxt/image",
    "@nuxtjs/google-fonts",
    "@nuxtjs/tailwindcss",
    "@gtm-support/vue-gtm",
    "@vueuse/nuxt",
    "@pinia/nuxt",
    "pinia",
    "axios",
    "dayjs",
    "floating-vue",
    "class-variance-authority",
    "typescript",
    "eslint",
    "cypress"
  ];

  // await $`yarn add -D ${devDependencies.join(" ")}`;
  for (const pkg of devDependencies) {
    try {
      await $`yarn add -D ${pkg}`;
      console.log(`${pkg} installed successfully!`);
    } catch (e) {
      console.error(`Error installing ${pkg}: ${e}`);
    }
  }
};

// Renombrado de archivos y carpetas
const createFolderNuxt3 = async () => {
  const renowned = [
    { from: "static", to: "public" },
    { from: "app.js", to: "app.vue" },
    { from: "nuxt.config.js", to: "nuxt.config.ts" }
  ];
  for (const item of renowned) {
    try {
      await $`mv ${item.from} ${item.to}`;
    } catch (error) {
      console.error("Error", error)
    }
  }
};

// app.js
const appVue = async () => {
  let imports = "";

  const filename = "app.vue";
  const data = await readFile(filename, "utf-8");

  try {
    imports = await $`cat ${filename} | grep '^import'`;
  } catch (error) {
    console.error("no hay imports", error);
  }

  try {
    const regExp = /(?<=app\.mixins\.push\(){([\s\S]*?)}(?=\))/gm;
    const match = regExp.exec(data);

    if (match) {
      const content = match[1].trim();
      const newAppVue = `<template>
  <div>
    <NuxtLayout>
      <NuxtLoadingIndicator :height="1" />

      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script>
${imports}

export default {
  name: "App",
  ${content}
};
</script>
`;
      await writeFile(filename, newAppVue);
      console.log("Archivo creado exitosamente!");
    }

  } catch (error) {
    console.error("Error", error)
  }
};

// nuxt.config.js
const nuxtConfig = async () => {
  const filename = "nuxt.config.ts";

  try {
    let content = await readFile(filename, "utf-8");
    console.log(content)
    console.log(filename)
    // Reemplaza export default por export default defineNuxtConfig({
    content = content.replace("export default {", "export default defineNuxtConfig({");
    content = content.replace("head,", `app: {
    head,
},`);
    // Agrega el paréntesis al final del archivo
    content = `${content}\n)`;

    // Escribe el archivo modificado
    fs.writeFileSync(filename, content, "utf-8");
    console.log("Archivo modificado correctamente");
  } catch (error) {
    console.error("Error", error)
  }
};

// update plugins
const updatePlugins = async () => {
  const updatePlugin = async (path, file) => {
    let content = await readFile(`${path}/${file}`, "utf-8");

    const newExport = "export default defineNuxtPlugin((";

    // Reemplaza export default por export default defineNuxtConfig({
    const oldExport = "export default (";
    if (content.includes(oldExport)) {
      content = content.replace(oldExport, newExport);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n)`;
    }

    // Reemplaza export default por export default defineNuxtConfig({
    const oldExportFunction = "export default function (";
    if (content.includes(oldExportFunction)) {
      content = content.replace(oldExportFunction, newExport);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n)`;
    }

    const oldVueUse = "Vue.use(";
    if (content.includes(oldVueUse)) {
      content = content.replace(oldVueUse, `${newExport}{ vueApp }) => {
        vueApp.use(`);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n})`;
    }

    const oldVueDirective = "Vue.directive(";
    if (content.includes(oldVueDirective) && !content.includes(newExport)) {
      content = content.replace(oldVueDirective, `${newExport}{ vueApp }) => {
        vueApp.directive(`);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n})`;
    }

    const oldVueComponent = "Vue.component(";
    if (content.includes(oldVueComponent) && !content.includes(newExport)) {
      content = content.replace(oldVueComponent, `${newExport}{ vueApp }) => {
        vueApp.use(`);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n})`;
    }

    // Remplazar vue por vueApp
    content = content.replace("import Vue from \"vue\"", "");
    content = content.replace("import Vue from 'vue'", "");
    content = content.replace(/Vue.use\(/g, "vueApp.use(");
    content = content.replace(/Vue.directive\(/g, "vueApp.directive(");
    content = content.replace(/Vue.component\(/g, "vueApp.component(");

    // Remplazar los injects por provides
    content = content.replace(", inject", "");
    content = content.replace(/inject\(/g, "provide(");

    // Escribe el archivo modificado
    fs.writeFileSync(`${path}/${file}`, content, "utf-8");
    await $`mv ${path}/${file} ${path}/${file.replace(".js", ".ts")}`;
  };

  const folderPath = "plugins";
  const files = await readdir(folderPath);

  for (const file of files) {
    if (file.includes(".js")) {
      await updatePlugin(folderPath, file);
    } else {
      const subFiles = await readdir(`${folderPath}/${file}`);

      for (const subFile of subFiles) {
        if (subFile.includes(".js")) {
          await updatePlugin(`${folderPath}/${file}`, subFile);
        }
      }
    }
  }
};

// update Middlewares
const updateMiddlewares = async () => {
  const updateMiddleware = async (path, file) => {
    let content = await readFile(`${path}/${file}`, "utf-8");

    const newExport = "export default defineNuxtRouteMiddleware((";
    const newExportSync = "export default defineNuxtRouteMiddleware(async (";

    // Reemplaza export default por export default defineNuxtConfig({
    const oldExport = "export default (";
    if (content.includes(oldExport)) {
      content = content.replace(oldExport, newExport);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n)`;
    }

    // Reemplaza export default por export default defineNuxtConfig({
    const oldExportFunction = "export default function (";
    if (content.includes(oldExportFunction)) {
      content = content.replace(oldExportFunction, newExport);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n)`;
    }

    // Reemplaza export default por export default defineNuxtConfig({
    const oldExportaSync = "export default async (";
    if (content.includes(oldExportaSync)) {
      content = content.replace(oldExportaSync, newExportSync);
      // Agrega el paréntesis al final del archivo
      content = `${content}\n)`;
    }

    content = content.replace(/redirect\(/g, "return navigateTo(");
    content = `import { defineNuxtRouteMiddleware, navigateTo } from '#app'\n${content}`;

    // Escribe el archivo modificado
    fs.writeFileSync(`${path}/${file}`, content, "utf-8");
    await $`mv ${path}/${file} ${path}/${file.replace(".js", ".ts")}`;
  };

  const folderPath = "middleware";
  const files = await readdir(folderPath);

  for (const file of files) {
    if (file.includes(".js")) {
      await updateMiddleware(folderPath, file);
    } else {
      const subFiles = await readdir(`${folderPath}/${file}`);

      for (const subFile of subFiles) {
        if (subFile.includes(".js")) {
          await updateMiddleware(`${folderPath}/${file}`, subFile);
        }
      }
    }
  }
};

// Vuex to pinia
const updateStoreToPinia = async () => {
  const updateMiddleware = async (file) => {
    if (file !== "store/common/settings.js") return;
    console.log("store/common/settings.js =============>");

    let imports = "";
    try {
      imports = await $`cat ${file} | grep '^import'`;
    } catch (error) {
      console.error("Error: no hay imports", error)
    }

    // let fileContent = await readFile(file, "utfº-8");
    const content = await readFile(file, "utf8");

    const regExp = /(?<=export const getters = {)([\s\S]*?)(?=\n})/gm;

    const listExportConstStore = [
      { name: "getters", value: "" },
      { name: "mutations", value: "" },
      { name: "actions", value: "" }
    ];

    for (const constStore of listExportConstStore) {
      const regExp = new RegExp(`(?<=export const ${constStore.name} = {)([\\s\\S]*?)(?=\\n})`, "gm");
      const match = regExp.exec(content);

      if (match) {
        listExportConstStore.find((item) => item.name === constStore.name).value = match[1].trim();
      }
    }

    // console.log(listExportConstStore);

    // Escribe el archivo modificado
    // fs.writeFileSync(`${path}/${file}`, content, "utf-8");
    // await $`mv ${path}/${file} ${path}/${file.replace(".js", ".ts")}`;
  };

  const loopFiles = async (folderPath) => {
    const files = await $`ls -A ${folderPath}`; // Obtener la lista de archivos en la carpeta actual

    for (const file of files.stdout.trim().split("\n")) {
      const filePath = `${folderPath}/${file}`;

      if (filePath.includes(".js")) {
        // Si no es una carpeta
        await updateMiddleware(filePath);
      } else {
        await loopFiles(filePath); // Llamar a la función recursivamente para buscar en la subcarpeta
      }
    }
  };

  try {
    await loopFiles("store");
  } catch (error) {
    console.error("Error", error)
  }
};

// Ejecución de funciones
await removeAllDsStore()
// await deletePkg();
// await folderBackup();
// await installPkg();
// await createFolderNuxt3();
// await folderType();
// await appVue();
// await nuxtConfig();
await updatePlugins();
await updateMiddlewares();
// await updateStoreToPinia();
