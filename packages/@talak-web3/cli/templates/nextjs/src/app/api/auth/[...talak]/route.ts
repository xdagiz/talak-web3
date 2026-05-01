import { createAuthHandler } from "@talak-web3/handlers/nextjs";

import { app } from "../../../../talak.config";

const handler = createAuthHandler(app);

export { handler as GET, handler as POST };
