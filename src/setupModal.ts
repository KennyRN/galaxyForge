import { Modal, App, Setting, Notice } from 'obsidian';

export interface SetupResult {
  starmapFolder: string;
  systemsFolder: string;
}

/**
 * First-run setup modal that asks the user where to store
 * starmap database notes and individual system notes.
 */
export class SetupModal extends Modal {
  private starmapFolder = '';
  private systemsFolder = 'Systems';
  private onComplete: (result: SetupResult) => void;

  constructor(app: App, onComplete: (result: SetupResult) => void) {
    super(app);
    this.onComplete = onComplete;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starforge-modal');

    contentEl.createEl('h2', { text: 'Welcome to StarForge!' });
    contentEl.createEl('p', {
      text: 'Let us set up where your star map data will be stored.',
    });

    new Setting(contentEl)
      .setName('Star map database folder')
      .setDesc('Folder where starmap notes (containing ```starmap blocks) will be stored. Leave empty to allow any folder.')
      .addText((text) =>
        text
          .setPlaceholder('e.g. StarMap (optional)')
          .onChange((v) => { this.starmapFolder = v.trim(); })
      );

    new Setting(contentEl)
      .setName('System notes folder')
      .setDesc('Folder where individual system markdown files will be created.')
      .addText((text) =>
        text
          .setPlaceholder('Systems')
          .setValue('Systems')
          .onChange((v) => { this.systemsFolder = v.trim() || 'Systems'; })
      );

    new Setting(contentEl)
      .setName('')
      .addButton((btn) =>
        btn
          .setButtonText('Get Started')
          .setCta()
          .onClick(() => {
            if (!this.systemsFolder) {
              new Notice('Please enter a folder name for system notes.');
              return;
            }
            this.onComplete({
              starmapFolder: this.starmapFolder,
              systemsFolder: this.systemsFolder,
            });
            this.close();
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
