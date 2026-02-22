const pino = () => ({ info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, child: () => ({ info: () => {}, error: () => {}, warn: () => {}, debug: () => {} }) });
pino.transport = () => {};
export default pino;
