import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { PublicError } from "./errors.js";
import { RenderQueue } from "./render-queue.js";
import { renderVerificationAnimation } from "./renderer.js";

export type VerificationStatus =
  | "pending"
  | "failed"
  | "completed"
  | "consumed"
  | "expired";

interface VerificationRecord {
  id: string;
  answerDigest: Buffer;
  answerSalt: Buffer;
  status: VerificationStatus;
  attemptsUsed: number;
  createdAt: number;
  expiresAt?: number;
  retryAvailableAt?: number;
  mediaPath: string;
  responseTokenHash?: Buffer;
  responseExpiresAt?: number;
  verifiedAt?: number;
}

export interface PublicVerification {
  verificationId: string;
  animationUrl: string;
  expiresInMs: number;
}

interface VerificationStoreOptions {
  answerFactory?: () => string;
  renderer?: (answer: string) => Buffer;
  mediaDirectory?: string;
  clock?: () => number;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBase64Url(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: Buffer | undefined, right: Buffer): boolean {
  return Boolean(left && left.length === right.length && timingSafeEqual(left, right));
}

export function normalizeAnswer(value: string): string {
  return value.trim().toUpperCase().replaceAll(/\s+/g, "");
}

export class VerificationStore {
  private readonly records = new Map<string, VerificationRecord>();
  private readonly runtimeSecret = randomBytes(32);
  private readonly renderQueue = new RenderQueue(config.maxRenderQueue);
  private readonly answerFactory: () => string;
  private readonly renderer: (answer: string) => Buffer;
  private readonly mediaDirectory: string;
  private readonly clock: () => number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: VerificationStoreOptions = {}) {
    this.answerFactory = options.answerFactory ?? (() => this.generateAnswer());
    this.renderer = options.renderer ?? renderVerificationAnimation;
    this.mediaDirectory = options.mediaDirectory ?? config.mediaDirectory;
    this.clock = options.clock ?? Date.now;
  }

  async start(): Promise<void> {
    await mkdir(this.mediaDirectory, { recursive: true });
    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, config.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await this.cleanup(true);
  }

  private digestAnswer(answer: string, salt: Buffer): Buffer {
    return createHmac("sha256", this.runtimeSecret)
      .update(salt)
      .update(answer)
      .digest();
  }

  private generateAnswer(): string {
    const bytes = randomBytes(4);
    return [...bytes]
      .map((value) => ALPHABET[value % ALPHABET.length])
      .join("");
  }

  async create(): Promise<PublicVerification> {
    await this.cleanup();
    if (this.records.size >= config.maxActiveVerifications) {
      throw new PublicError(
        503,
        "service-unavailable",
        "The service is at its active verification limit. Please retry shortly."
      );
    }

    const verificationId = `ver_${randomBase64Url(9)}`;
    const answer = this.answerFactory();
    const salt = randomBytes(16);
    const answerDigest = this.digestAnswer(answer, salt);
    const mediaPath = path.join(this.mediaDirectory, `${verificationId}.gif`);
    const media = await this.renderQueue.run(() => this.renderer(answer));

    await writeFile(mediaPath, media, { flag: "wx" });
    const now = this.clock();
    this.records.set(verificationId, {
      id: verificationId,
      answerDigest,
      answerSalt: salt,
      status: "pending",
      attemptsUsed: 0,
      createdAt: now,
      mediaPath
    });

    return {
      verificationId,
      animationUrl: `/api/verifications/${encodeURIComponent(verificationId)}/animation`,
      expiresInMs: config.verificationLifetimeMs
    };
  }

  getMediaPath(verificationId: string): string {
    const record = this.records.get(verificationId);
    if (!record) {
      throw new PublicError(404, "verification-not-found", "Verification not found.");
    }
    if (record.status !== "pending") throw this.statusError(record.status);
    const now = this.clock();
    if (record.expiresAt === undefined) {
      record.expiresAt = now + config.}ºï½-¢G§²ÚîÆ­yÖÆBÖ†ÇfVB"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&†W&ôW–V'&÷r#ä…TÔå2”ââ$õE2„TÄB$4²ãÂ÷7ããÂ÷à¢ÆƒFFÖ“†ãÒ&†W&õF—FÆR#äÆWB‡VÖç2F‡&÷Vv‚ãÆ'#äÖ¶R&÷G2’ãÂöƒà¢Ç6Æ73Ò&†W&òÖÆVB"FFÖ“†ãÒ&†W&ôÆVB#äæW†4D4„GW&ç2f÷W"6†&7FW'2–çFòÖ÷f–ærF&vWBâV÷ÆRföÆÆ÷r—BæGW&ÆÇ’â&÷G2×W7B6†6R–æ6ö×ÆWFRÂF—7F÷'FVB–V6W27&÷72F†RgVÆÂæ–ÖF–öî(	FöâWfW'’GFV×BãÂ÷à¢ÆF—b6Æ73Ò&†W&òÖ7F–öç2#à¢Æ6Æ73Ò&'WGFöâ'WGFöâ×&–Ö'’"‡&VcÒ"6FVÖò#ãÆ’6Æ73Ò&f×6öÆ–Bf×Æ’"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'G'”—B#åG'’—CÂ÷7ããÂöà¢Æ6Æ73Ò&'WGFöâ'WGFöâ×6V6öæF'’"‡&VcÒ"76WGW#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6öFR"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&FEFõ6—FR#äFBFò–÷W"6—FSÂ÷7ããÂöà¢ÂöF—cà¢ÇVÂ6Æ73Ò&†W&òÖæ÷FW2"&–ÖÆ&VÃÒ%&öGV7B†–v†Æ–v‡G2#à¢ÆÆ“ãÆ’6Æ73Ò&f×6öÆ–BfÖW–R×6Æ6‚"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&æô6ÆVäg&ÖR#äæò6ÆVâ67&VVç6†÷CÂ÷7ããÂöÆ“à¢ÆÆ“ãÆ’6Æ73Ò&f×6öÆ–BfÖ'&÷w2×WÖF÷vâÖÆVgB×&–v‡B"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&6†æv–ætÖ÷F–öâ#ä6†æv–ærÖ÷F–öâæB6†SÂ÷7ããÂöÆ“à¢ÆÆ“ãÆ’6Æ73Ò&f×6öÆ–BfÖvVvRÖ†–v‚"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&†–v†W$6÷7B#äÖ÷&Rv÷&²W"&÷BGFV×CÂ÷7ããÂöÆ“à¢Â÷VÃà¢ÂöF—cà ¢ÆF—b6Æ73Ò&FVÖòÖ6&B&WfVÂ"–CÒ&FVÖò#à¢ÆF—b6Æ73Ò&6&BÖ†VF–ær#à¢ÆF—cà¢Ç6Æ73Ò&W–V'&÷r#ãÆ’6Æ73Ò&f×6öÆ–Bf×Æ’"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&Æ—fTFVÖò#äÄ•dRDTÔóÂ÷7ããÂ÷à¢Æƒ"FFÖ“†ãÒ'G'”æW†#åG'’æW†4D4„Âöƒ#à¢ÂöF—cà¢Ç7â6Æ73Ò&Æ—fR×–ÆÂ#ãÇ7â&–Ö†–FFVãÒ'G'VR#ãÂ÷7ããÇ7âFFÖ“†ãÒ'&VG’#å&VG“Â÷7ããÂ÷7ãà¢ÂöF—cà¢Ç6Æ73Ò&6&BÖ†VÇ"FFÖ“†ãÒ&FVÖô†VÇ#äföÆÆ÷rF†RÖ÷f–ærv–æF÷rÂF†VâVçFW"ÆÂf÷W"6†&7FW'2ãÂ÷à¢ÆF—b6Æ73Ò&æW†Ö6F6†"FFÖ6ÆÆ&6³Ò&öäæW†6ö×ÆWFR#ãÂöF—cà¢Æ÷WGWB6Æ73Ò&FVÖòÖ÷WGWB"–CÒ&FVÖòÖ÷WGWB"&–ÖÆ—fSÒ'öÆ—FR#à¢Æ’6Æ73Ò&f×6öÆ–BfÖ6—&6ÆRÖ–æfò"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Ç7âFFÖ“†ãÒ&FVÖô÷WGWB#å–÷W"&W7VÇBv–ÆÂV"†W&RãÂ÷7ãà¢Âö÷WGWCà¢ÂöF—cà¢Â÷6V7F–öãà ¢Ç6V7F–öâ6Æ73Ò'6V7F–öâ6†VÆÂ"–CÒ&fVGW&W2"&–ÖÆ&VÆÆVF'“Ò&fVGW&W2×F—FÆR#à¢ÆF—b6Æ73Ò'6V7F–öâÖ†VF–ær&WfVÂ#à¢Ç6Æ73Ò&W–V'&÷rW–V'&÷r×W'ÆR#ãÆ’6Æ73Ò&f×6öÆ–Bf×7F""&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&fVGW&W4W–V'&÷r#ädTEU$U3Â÷7ããÂ÷à¢Æƒ"–CÒ&fVGW&W2×F—FÆR"FFÖ“†ãÒ&fVGW&W5F—FÆR#åv‡’W6RæW†4D4„óÂöƒ#à¢ÇFFÖ“†ãÒ&fVGW&W4ÆVB#å&æFöÒF—7F÷'F–öâÂ–æFWVæFVçBÖ÷fVÖVçBÂæB–æ6ö×ÆWFRF—7Æ’f÷&6RWFöÖFVB6öÇfW'2FòFòf"Ö÷&Rv÷&²f÷"WfW'’ç7vW"ãÂ÷à¢ÂöF—cà¢ÆF—b6Æ73Ò&fVGW&RÖw&–B#à¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–BfÖW–R×6Æ6‚"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&T–æ6ö×ÆWFUF—FÆR#ä–æ6ö×ÆWFR'’FW6–vãÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&T–æ6ö×ÆWFT&öG’#äg&ÖRæWfW"W‡÷6W2Ö÷&RF†âCRöbç’öæR6†&7FW"ãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–Bf×væBÖÖv–2×7&¶ÆW2"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&TF—7F÷'F–öåF—FÆR#ä6öç7FçBF—7F÷'F–öãÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&TF—7F÷'F–öä&öG’#ä6†&7FW'2¶VW&VæF–ærÂ7G&WF6†–ærÂ&÷FF–ærÂæB6†æv–ær6†RãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–BfÖ'&÷w2×WÖF÷vâÖÆVgB×&–v‡B"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&TÖ÷F–öåF—FÆR#ä–æFWVæFVçBÖ÷fVÖVçCÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&TÖ÷F–öä&öG’#äWfW'’6†&7FW"Ö÷fW2–â—G2÷vâF—&V7F–öâæBB—G2÷vâ6†æv–ær7VVBãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–Bf×6‡VffÆR"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&Uv–æF÷uF—FÆR#äâVç&VF–7F&ÆRv–æF÷sÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&Uv–æF÷t&öG’#åF†Rf—6–&ÆR6†R¶VW2&VæF–æræB6†æv–ærv†–ÆR—B7VVG2WÂ6Æ÷w2F÷vâÂæBÖ÷fW2&6·v&BãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–BfÖf–ævW'&–çB"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&UVæ—VUF—FÆR#äF–ffW&VçBWfW'’F–ÖSÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&UVæ—VT&öG’#äæ–ÖF–öâÆVæwF‚Â6öÆ÷"ÂÖ÷F–öâÂF—7F÷'F–öâÂæBF–Ö–ær6†ævRv—F‚WfW'’4D4„ãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&fVGW&RÖ6&B&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–BfÖvVvRÖ†–v‚"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢Æƒ2FFÖ“†ãÒ&fVGW&T6÷7EF—FÆR#ä†–v†W"6öÇf–ær6÷7CÂöƒ3à¢ÇFFÖ“†ãÒ&fVGW&T6÷7D&öG’#ä&÷G2×W7B–ç7V7BÖç’g&ÖW2ÂG&6²Ö÷f–ærg&vÖVçG2ÂæB&V'V–ÆBF†Rç7vW"–ç7FVBöb&VF–æröæR–ÖvRãÂ÷à¢Âö'F–6ÆSà¢ÂöF—cà ¢Æ6–FR6Æ73Ò&W‡W&–ÖVçB×æVÂ&WfVÂ"–CÒ&W‡W&–ÖVçB"&–ÖÆ&VÆÆVF'“Ò&W‡W&–ÖVçB×F—FÆR#à¢ÆF—b6Æ73Ò&W‡W&–ÖVçBÖ†VF–ær#à¢ÆF—cà¢Ç6Æ73Ò&W–V'&÷r#ãÆ’6Æ73Ò&f×6öÆ–BfÖfÆ6²"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçDW–V'&÷r#å4ÔÄÂÕ44ÄRDU5CÂ÷7ããÂ÷à¢Æƒ2–CÒ&W‡W&–ÖVçB×F—FÆR"FFÖ“†ãÒ&W‡W&–ÖVçEF—FÆR#äf7Bf÷"V÷ÆRâW‡Vç6—fRf÷"’ãÂöƒ3à¢Ç6Æ73Ò&W‡W&–ÖVçBÖÆVB"FFÖ“†ãÒ&W‡W&–ÖVçDÆVB#åF†R6ÖRÖöFVÂv2FW7FVBv—F‚æBv—F†÷WB7G&FVw’ÆV&æVBg&öÒV&Æ–W"GFV×G2ãÂ÷à¢ÂöF—cà¢Ç7â6Æ73Ò&W‡W&–ÖVçB×fW'6–öâ#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6—&6ÆRÖ6†V6²"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçEfW'6–öâ#åFW7FVB'V–ÆCÂ÷7ããÂ÷7ãà¢ÂöF—cà¢ÆF—b6Æ73Ò&W‡W&–ÖVçB×&W7VÇG2#à¢Æ'F–6ÆR6Æ73Ò&W‡W&–ÖVçB×&W7VÇBW‡W&–ÖVçBÖ‡VÖâ#à¢ÆF—b6Æ73Ò&W‡W&–ÖVçBÖÆ&VÂ#ãÆ’6Æ73Ò&f×6öÆ–Bf×W6W""&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçD‡VÖäÆ&VÂ#ä‡VÖãÂ÷7ããÂöF—cà¢Ç7G&öæsããCÇ7âFFÖ“†ãÒ&W‡W&–ÖVçE6V6öæG2#ç2fW&vSÂ÷7ããÂ÷7G&öæsà¢ÇFFÖ“†ãÒ&W‡W&–ÖVçD‡VÖäÖWF#äfW&vR6ö×ÆWF–öâF–ÖSÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&W‡W&–ÖVçB×&W7VÇBW‡W&–ÖVçBÖwBÖ6öÆB#à¢ÆF—b6Æ73Ò&W‡W&–ÖVçBÖÆ&VÂ#ãÆ’6Æ73Ò&f×6öÆ–Bf×&ö&÷B"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçD6öÆDÆ&VÂ#äuBRãb6öÂÒÖVF—VÒ+ræòW‡W&–Væ6SÂ÷7ããÂöF—cà¢Ç7G&öæsãSÇ7âFFÖ“†ãÒ&W‡W&–ÖVçE7V66W72#ç7V66W73Â÷7ããÂ÷7G&öæsà¢ÇFFÖ“†ãÒ&W‡W&–ÖVçD6öÆDÖWF#äæò&–÷"6öÇf–ær7G&FVw“Â÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ73Ò&W‡W&–ÖVçB×&W7VÇBW‡W&–ÖVçBÖwB×v&Ò#à¢ÆF—b6Æ73Ò&W‡W&–ÖVçBÖÆ&VÂ#ãÆ’6Æ73Ò&f×6öÆ–BfÖ'&–â"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçEv&ÔÆ&VÂ#äuBRãb6öÂÒÖVF—VÒ+rW‡W&–Væ6VCÂ÷7ããÂöF—cà¢Ç7G&öæsã#£CÇ7âFFÖ“†ãÒ&W‡W&–ÖVçDfW&vR#æfW&vSÂ÷7ããÂ÷7G&öæsà¢ÇFFÖ“†ãÒ&W‡W&–ÖVçEv&ÔÖWF#åW6VB7G&FVw’ÆV&æVBg&öÒV&Æ–W"6öÇfW3Â÷à¢Âö'F–6ÆSà¢ÂöF—cà ¢Ç6V7F–öâ6Æ73Ò&vöövÆRÖ6ö×&—6öâ"&–ÖÆ&VÆÆVF'“Ò&vöövÆRÖ6ö×&—6öâ×F—FÆR#à¢ÆF—b6Æ73Ò&6ö×&—6öâÖ†VF–ær#à¢ÆF—cà¢Ç6Æ73Ò&W–V'&÷r#ãÆ’6Æ73Ò&fÖ'&æG2fÖvöövÆR"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&6ö×&—6öäW–V'&÷r#å4ÔRÔôDTÂ+rtôôtÄR$T4D4„Â÷7ããÂ÷à¢ÆƒB–CÒ&vöövÆRÖ6ö×&—6öâ×F—FÆR"FFÖ“†ãÒ&6ö×&—6öåF—FÆR#äfÖ–Æ–"–ÖvRFW7Bv2f7FW"âF†R6†V6¶&÷‚6¶VBæ÷F†–ærãÂöƒCà¢ÂöF—cà¢Ç7âFFÖ“†ãÒ&6ö×&—6öäÖöFVÂ#äuBRãb6öÂÒÖVF—VÓÂ÷7ãà¢ÂöF—cà¢ÆF—b6Æ73Ò&6ö×&—6öâ×&W7VÇG2#à¢Æ'F–6ÆSà¢Æ’6Æ73Ò&f×6öÆ–BfÖ–ÖvW2"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢ÆF—cãÇ7G&öærFFÖ“†ãÒ&6ö×&—6öä–ÖvUF—FÆR#ä–ÖvR6†ÆÆVævSÂ÷7G&öæsãÇFFÖ“†ãÒ&6ö×&—6öä–ÖvTÖWF#ä&÷WB£3+r76VBöâF†Rf—'7Bç7vW#Â÷ãÂöF—cà¢Âö'F–6ÆSà¢Æ'F–6ÆSà¢Æ’6Æ73Ò&f×6öÆ–BfÖ6†V6²"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢ÆF—cãÇ7G&öærFFÖ“†ãÒ&6ö×&—6öä6†V6¶&÷…F—FÆR#ä6†V6¶&÷ƒÂ÷7G&öæsãÇFFÖ“†ãÒ&6ö×&—6öä6†V6¶&÷„ÖWF#å76VBF—&V7FÇ’+ræò–ÖvR6†ÆÆVævR6†÷vãÂ÷ãÂöF—cà¢Âö'F–6ÆSà¢ÂöF—cà¢Â÷6V7F–öãà¢Ç6Æ73Ò&W‡W&–ÖVçBÖæ÷FR#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6—&6ÆRÖ–æfò"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&W‡W&–ÖVçDæ÷FR#äFö7VÖVçFVB6ÖÆÂ×66ÆRFW7BöbF†R7W'&VçBfW'6–öââ&W7VÇG2FW67&–&RF†W6R'Vç2æB&Ræ÷B6V7W&—G’wV&çFVRãÂ÷7ããÂ÷à¢Âö6–FSà¢Â÷6V7F–öãà ¢Ç6V7F–öâ6Æ73Ò'6V7F–öâFö72×6V7F–öâ"–CÒ'6WGW"&–ÖÆ&VÆÆVF'“Ò'6WGW×F—FÆR#à¢ÆF—b6Æ73Ò'6†VÆÂ#à¢ÆF—b6Æ73Ò'6V7F–öâÖ†VF–ær&WfVÂ#à¢Ç6Æ73Ò&W–V'&÷r#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6öFR"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'6WGWW–V'&÷r#å4UEUÂ÷7ããÂ÷à¢Æƒ"–CÒ'6WGW×F—FÆR"FFÖ“†ãÒ'6WGWF—FÆR#äFBæW†4D4„Fò–÷W"6—FSÂöƒ#à¢ÇFFÖ“†ãÒ'6WGWÆVB#ä6÷’F†W6RGvò–V6W2âæòg&öçFVæBg&ÖWv÷&²—2&WV—&VBãÂ÷à¢ÂöF—cà ¢Æ'F–6ÆR6Æ73Ò'6WGW×&÷r&WfVÂ#à¢ÆF—b6Æ73Ò'6WGWÖ6÷’#à¢Ç7â6Æ73Ò'7FWÖçVÖ&W"#ãÂ÷7ãà¢ÆF—cãÆƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖF÷væÆöB"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&ÆöEF—FÆR#å7FRF†—2–çFò–÷W"…DÔÃÂ÷7ããÂöƒ3ãÇFFÖ“†ãÒ&ÆöD&öG’#åF†R67&—BÆöG2æW†4D4„âF†RF—b6†ö÷6W2v†W&R—BV'2ãÂ÷ãÂöF—cà¢ÂöF—cà¢ÆF—b6Æ73Ò&6öFR×v–æF÷r#à¢ÆF—b6Æ73Ò&6öFR×FööÆ&"#ãÇ7ããÆ’6Æ73Ò&fÖ'&æG2fÖ‡FÖÃR"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&‡FÖÄÆö6F–öâ#ä…DÔÂ+rvRÖ&·WÂ÷7ããÂ÷7ããÆ'WGFöâ6Æ73Ò&6÷’Ö'WGFöâ"G—SÒ&'WGFöâ"FFÖ6÷“Ò&VÖ&VBÖ6öFR#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6÷’"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ6÷’ÖÆ&VÂFFÖ“†ãÒ&6÷’#ä6÷“Â÷7ããÂö'WGFöããÂöF—cà¢Ç&SãÆ6öFR–CÒ&VÖ&VBÖ6öFR#âfÇC·67&—B7&3Ò&‡GG3¢òöæW†6F6†ç¦öæRæ–Bö6F6†æ§2"FVfW"fwC²fÇC²÷67&—BfwC° ¢fÇC¶F—b6Æ73Ò&æW†Ö6F6†"FFÖ6ÆÆ&6³Ò&öäæW†6ö×ÆWFR"fwC²fÇC²öF—bfwC³Âö6öFSãÂ÷&Sà¢ÂöF—cà¢Âö'F–6ÆSà ¢Æ'F–6ÆR6Æ73Ò'6WGW×&÷r&WfVÂ#à¢ÆF—b6Æ73Ò'6WGWÖ6÷’#à¢Ç7â6Æ73Ò'7FWÖçVÖ&W"#ã#Â÷7ãà¢ÆF—cãÆƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖ'&÷r×&–v‡B"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'6VæEF—FÆR#å6VæBF†R&W7VÇBv—F‚–÷W"f÷&ÓÂ÷7ããÂöƒ3ãÇFFÖ“†ãÒ'6VæD&öG’#åWBF†—2–â–÷W"g&öçFVæB¦f67&—Bâ&WÆ6R–÷W%7V&Ö—DgVæ7F–öâv—F‚–÷W"W†—7F–ær7V&Ö—BgVæ7F–öâãÂ÷ãÂöF—cà¢ÂöF—cà¢ÆF—b6Æ73Ò&6öFR×v–æF÷r#à¢ÆF—b6Æ73Ò&6öFR×FööÆ&"#ãÇ7ããÆ’6Æ73Ò&fÖ'&æG2fÖ§2"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&g&öçFVæDÆö6F–öâ#ä¦f67&—B+rg&öçFVæCÂ÷7ããÂ÷7ããÆ'WGFöâ6Æ73Ò&6÷’Ö'WGFöâ"G—SÒ&'WGFöâ"FFÖ6÷“Ò&6ÆÆ&6²Ö6öFR#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6÷’"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ6÷’ÖÆ&VÂFFÖ“†ãÒ&6÷’#ä6÷“Â÷7ããÂö'WGFöããÂöF—cà¢Ç&SãÆ6öFR–CÒ&6ÆÆ&6²Ö6öFR#ægVæ7F–öâöäæW†6ö×ÆWFR‡&W7VÇB’°¢–b‚&W7VÇBç7V66W72’&WGW&ã° ¢–÷W%7V&Ö—DgVæ7F–öâ‡°¢fW&–f–6F–öä–C¢&W7VÇBçfW&–f–6F–öä–BÀ¢&W7öç6UFö¶Vã¢&W7VÇBç&W7öç6UFö¶Và¢Ò“°§ÓÂö6öFSãÂ÷&Sà¢ÂöF—cà¢Âö'F–6ÆSà ¢ÆF—b6Æ73Ò'&ÖWFW"Ö6&B&WfVÂ#à¢Æƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖ6—&6ÆRÖ–æfò"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'fÇVW5F—FÆR#åGvòfÇVW26öÖR&6³Â÷7ããÂöƒ3à¢ÆFÃà¢ÆF—cãÆGCçfW&–f–6F–öä–CÂöGCãÆFBFFÖ“†ãÒ&–DÖVæ–ær#åF†R”BöbF†R6ö×ÆWFVB4D4„ãÂöFCãÂöF—cà¢ÆF—cãÆGCç&W7öç6UFö¶VãÂöGCãÆFBFFÖ“†ãÒ'Fö¶VäÖVæ–ær#å&ööbF†B—Bv26ö×ÆWFVBâ—Bv÷&·2öæ6RãÂöFCãÂöF—cà¢ÂöFÃà¢ÂöF—cà¢ÂöF—cà¢Â÷6V7F–öãà ¢Ç6V7F–öâ6Æ73Ò'6V7F–öâ6†VÆÂ"–CÒ'fW&–g’"&–ÖÆ&VÆÆVF'“Ò'fW&–g’×F—FÆR#à¢ÆF—b6Æ73Ò'6V7F–öâÖ†VF–ær&WfVÂ#à¢Ç6Æ73Ò&W–V'&÷rW–V'&÷r×W'ÆR#ãÆ’6Æ73Ò&f×6öÆ–Bf×6W'fW""&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'fW&–g”W–V'&÷r#ä$4´TäBdU$”d”4D”ôãÂ÷7ããÂ÷à¢Æƒ"–CÒ'fW&–g’×F—FÆR"FFÖ“†ãÒ'fW&–g•F—FÆR#ä6†V6²—Böâ–÷W"6W'fW#Âöƒ#à¢ÇFFÖ“†ãÒ'fW&–g”ÆVB#ä&Vf÷&R66WF–ærF†Rf÷&ÒÂ6–vçWÂ÷"Æöv–âÂ6VæB&÷F‚fÇVW2FòæW†4D4„ãÂ÷à¢ÂöF—cà ¢ÆF—b6Æ73Ò'fW&–g’ÖÆ–÷WB#à¢Æ'F–6ÆR6Æ73Ò&VæGö–çBÖ6&B&WfVÂ#à¢Æ†VFW#ãÇ7â6Æ73Ò&ÖWF†öB#åõ5CÂ÷7ããÆ6öFSâö’÷6—FWfW&–g“Âö6öFSãÂö†VFW#à¢ÆF—b6Æ73Ò&VæGö–çB×'B#ãÆƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖ'&÷r×WÖg&öÒÖ'&6¶WB"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'&WVW7B#å&WVW7CÂ÷7ããÂöƒ3ãÇ&SãÆ6öFR–CÒ'fW&–g’Ö–çWB#ç°¢'fW&–f–6F–öä–B#¢"fÇC·fW&–f–6F–öä–BfwC²"À¢'&W7öç6UFö¶Vâ#¢"fÇC·&W7öç6UFö¶VâfwC² §ÓÂö6öFSãÂ÷&SãÂöF—cà¢ÆF—b6Æ73Ò&VæGö–çB×'B#ãÆƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖ'&÷rÖF÷vâ"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ'7V66W75&W7öç6R#å&W7öç6R+r7V66W73Â÷7ããÂöƒ3ãÇ&SãÆ6öFSç°¢'7V66W72#¢G'VRÀ¢'fW&–f–VDB#¢###bÓ‚ÓuC#£3£ã¢ §ÓÂö6öFSãÂ÷&SãÂöF—cà¢ÆF—b6Æ73Ò&VæGö–çB×'B#ãÆƒ3ãÆ’6Æ73Ò&f×6öÆ–BfÖ6—&6ÆR×†Ö&²"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&f–ÇW&U&W7öç6R#å&W7öç6R+rf–ÇW&SÂ÷7ããÂöƒ3ãÇ&SãÆ6öFSç°¢'7V66W72#¢fÇ6RÀ¢&W'&÷$6öFR#¢&–çfÆ–BÖ÷"ÖW‡—&VB×fW&–f–6F–öâ §ÓÂö6öFSãÂ÷&SãÂöF—cà¢Âö'F–6ÆSà ¢Æ'F–6ÆR6Æ73Ò&&6¶VæBÖ6&B&WfVÂ#à¢ÆF—b6Æ73Ò&6öFR×FööÆ&"#ãÇ7ããÆ’6Æ73Ò&fÖ'&æG2fÖæöFRÖ§2"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ“†ãÒ&&6¶VæDÆö6F–öâ#äæöFRæ§2+r&6¶VæCÂ÷7ããÂ÷7ããÆ'WGFöâ6Æ73Ò&6÷’Ö'WGFöâ"G—SÒ&'WGFöâ"FFÖ6÷“Ò&&6¶VæBÖ6öFR#ãÆ’6Æ73Ò&f×6öÆ–BfÖ6÷’"&–Ö†–FFVãÒ'G'VR#ãÂö“ãÇ7âFFÖ6÷’ÖÆ&VÂFFÖ“†ãÒ&6÷’#ä6÷“Â÷7ããÂö'WGFöããÂöF—cà¢Ç&SãÆ6öFR–CÒ&&6¶VæBÖ6öFR#æ6öç7B&W7öç6RÒv—BfWF6‚€¢&‡GG3¢òöæW†6F6†ç¦öæRæ–Bö’÷6—FWfW&–g’"À¢°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²$6öçFVçBÕG—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢fW&–f–6F–öä–BÀ¢&W7öç6UFö¶Và¢Ò¢Ð¢“° ¦6öç7B&W7VÇBÒv—B&W7öç6Ræ§6öâ‚“°¦–b‚&W7VÇBç7V66W72’°¢&WGW&â&W2ç7FGW2ƒC2’ç6VæB‚%fW&–f–6F–öâf–ÆVB"“°§ÓÂö6öFSãÂ÷&Sà¢Âö'F–6ÆSà¢ÂöF—cà ¢Æ6–FR6Æ73Ò&–×÷'FçBÖæ÷FR&WfVÂ#à¢Æ’6Æ73Ò&f×6öÆ–BfÖÆö6²"&–Ö†–FFVãÒ'G'VR#ãÂö“à¢ÇFFÖ“†ãÒ&–×÷'FçB#ä6öçF–çVRöæÇ’v†VâF†R&W7öç6R6—27V66W73¢G'VRâ&W7öç6UFö¶Vâv÷&·2öæ6RæBW‡—&W2gFW"f—fRÖ–çWFW2ãÂ÷à¢Âö6–FSà¢Â÷6V7F–öãà¢ÂöÖ–ãà ¢Æfö÷FW"6Æ73Ò'6—FRÖfö÷FW"#à¢ÆF—b6Æ73Ò'6†VÆÂfö÷FW"Öw&–B#à¢ÆF—b6Æ73Ò&fö÷FW"Ö'&æB#ãÆ–Ör7&3Ò"ö76WG2öÆövòç7fr"ÇCÒ""v–GFƒÒ#3"†V–v‡CÒ#3#ãÆF—cãÇ7G&öæsäæW†4D4„Â÷7G&öæsãÇ7âFFÖ“†ãÒ&fö÷FW%FvÆ–æR#å6–×ÆRÖ÷F–öâÖ&6VB‡VÖâfW&–f–6F–öâãÂ÷7ããÂöF—cãÂöF—cà¢Æ6Æ73Ò&v—F‡V"ÖÆ–æ²"‡&VcÒ&‡GG3¢òöv—F‡V"æ6öÒôæWW&ÄæW‡W4Æ"Öæ‚ôæW†4D4„"F&vWCÒ%ö&Ææ²"&VÃÒ&æö÷VæW"æ÷&VfW'&W"#ãÆ’6Æ73Ò&fÖ'&æG2fÖv—F‡V""&–Ö†–FFVãÒ'G'VR#ãÂö“äv—D‡V#Âöà¢ÂöF—cà¢Âöfö÷FW#à¢ÆF—b6Æ73Ò'7"ÖöæÇ’"–CÒ&6÷’×7FGW2"&–ÖÆ—fSÒ'öÆ—FR#ãÂöF—cà¢Âö&öG“à£Âö‡FÖÃà 