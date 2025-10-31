declare module "gtts" {
  class gTTS {
    constructor(text: string, lang: string);
    save(filename: string, callback: (err: any) => void): void;
  }
  export = gTTS;
}
