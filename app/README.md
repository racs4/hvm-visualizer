# HVM-Visualizer-Component

To install: `npm i hvm-visualizer-component`

To use it in a React App:

```javascript
import { HVMVisualizer } from "hvm-visualizer-component";

export default function () {
  return <HVMVisualizer></HVMVisualizer>;
}
```

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
