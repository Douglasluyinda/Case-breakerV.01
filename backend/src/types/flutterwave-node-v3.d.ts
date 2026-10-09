// Minimal type declaration for flutterwave-node-v3 (no official @types package).
declare module "flutterwave-node-v3" {
  class Flutterwave {
    constructor(publicKey: string, secretKey: string);
    Payment: {
      initiate(payload: Record<string, unknown>): Promise<{
        status: string;
        message: string;
        data: { link: string };
      }>;
    };
    Transaction: {
      verify(payload: { id: string | number }): Promise<{
        status: string;
        data: { status: string; amount: number; tx_ref: string };
      }>;
    };
  }
  export = Flutterwave;
}
