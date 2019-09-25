let yaml = require("js-yaml")
let fs = require("fs").promises
let {basename: getBaseName, resolve: resolvePath} = require("path")
let execa = require("execa")

let run = run => ({run})

void async function () {
	await execa("git", ["clean", "-fxd"])
	let circleConfig = yaml.safeLoad(await fs.readFile(".circleci/config.yml"))
	circleConfig.jobs.test.steps = [
		"checkout",
		run("npm install --only=dev"),
		run("npx origami-ci branch")
	]

	if (!circleConfig.jobs["publish_to_npm"]) {
		console.error("no publish to npm step! aborting!!!")
		process.exit(2)
	}

	circleConfig.jobs["publish_to_npm"].steps = [
		"checkout",
		run("npm install --only=dev"),
		run("npx origami-ci release")
	]

	await fs.writeFile(".circleci/config.yml", yaml.safeDump(circleConfig), "utf-8")

	let packageJson = await fs.readFile("package.json").catch(() => "{\"private\": true}")
	let manifest = JSON.parse(packageJson)
	manifest.name = "o-" + getBaseName(resolvePath("."))
	manifest.private = true
	manifest.devDependencies = manifest.devDependencies || {}
	manifest.devDependencies["origami-ci-tools"] = "^1.0.0"
	await fs.writeFile("package.json", JSON.stringify(manifest, null, "\t") + "\n", "utf-8")

	await execa("git", ["checkout", "-b", "use-origami-ci-tools"])
	await execa("git", ["add", ".circleci/config.yml", "package.json"])
	await execa("git", ["commit", "-m", "Use origami-ci !"])
	await execa("git", ["push", "-f"])
}()
