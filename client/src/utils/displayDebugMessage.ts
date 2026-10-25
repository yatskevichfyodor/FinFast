import { push } from "notivue";

function stringifyError(error: Error): string {
  return JSON.stringify(
    {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    null,
    4,
  );
}

function stringify(arg: any): string {
  if (arg instanceof Error) {
    return stringifyError(arg);
  }
  return JSON.stringify(arg, null, 4);
}

export default (...args: any[]) => {
  const displayMessage = args.map((it) => stringify(it)).join(", ");
  push.info(displayMessage);
  console.info(displayMessage);
};
