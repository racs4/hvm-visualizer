# HVM-Visualizer

To install: `npm i -g hvm-visualizer`

- To use with text: `hvm-visualizer t <text-content>`
- To use with stdin (assumes that you have hvm installed): `hvm d <hvm-file> <hvm-arg> | hvm-visualizer s`
- To use with file: `hvm-visualizer f <file>`

## Contributing

If you want to modify something in HVM-Visualizer appearance go to the
`app` folder. It is a React app, and just like a normal React app, you can
run `npm run start` to view your modifications at `localhost`.

If you want to modify something in the CLI or in the CLI local server, go to
`index.js`, all the code stays there (maybe I'll organize this in the future).

### Building

If you want to build everything in an easy way, use `build.sh` file:
  - You must give permisssion to it (only needed once): `chmod +x build.sh`
  - Run: `./build.sh`
