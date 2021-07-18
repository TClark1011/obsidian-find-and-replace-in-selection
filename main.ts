import {
	App,
	ButtonComponent,
	Editor,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TextComponent,
	EditorPosition,
} from "obsidian";
import escapeStringRegexp from "escape-string-regexp";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log("loading plugin");

		await this.loadSettings();

		this.addCommand({
			id: "find-and-replace-in-selection",
			name: "Find And Replace",
			editorCheckCallback: (checking: boolean, editor) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new FindAndReplaceModal(this.app, editor).open();
					}
					return true;
				}
				return false;
			},
		});

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log("codemirror", cm);
		});

		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000),
		);
	}

	onunload() {
		console.log("unloading plugin");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FindAndReplaceModal extends Modal {
	constructor(app: App, editor: Editor) {
		super(app);
		this.shouldRestoreSelection = true;
		this.editor = editor;
	}

	editor: Editor;

	onOpen() {
		let { contentEl, titleEl, editor, modalEl } = this;

		modalEl.addClass("find-and-replace-modal");
		titleEl.setText("Find and Replace in Selection");

		const rowClass = "row";

		const createInterfaceInputRow = (
			label: string,
			placeholder: string,
		): TextComponent => {
			const containerEl = document.createElement("div");
			containerEl.addClass(rowClass);

			const targetEl = document.createElement("div");
			targetEl.addClass("input-wrapper");

			const labelEl = document.createElement("div");
			labelEl.addClass("input-label");
			labelEl.setText(label);

			containerEl.appendChild(labelEl);
			containerEl.appendChild(targetEl);

			const component = new TextComponent(targetEl);
			component.setPlaceholder(placeholder);

			contentEl.append(containerEl);
			return component;
		};

		const submitButtonTarget = document.createElement("div");
		submitButtonTarget.addClass("submit-button-wrapper");
		submitButtonTarget.addClass("row");

		const findInputComponent = createInterfaceInputRow("Find", "Text");
		const replaceWithInputComponent = createInterfaceInputRow(
			"Replace With",
			"Replacement",
		);

		const submitButtonComponent = new ButtonComponent(submitButtonTarget);
		submitButtonComponent.setButtonText("Replace All");
		submitButtonComponent.setCta();
		submitButtonComponent.onClick(() => {
			const search = new RegExp(
				escapeStringRegexp(findInputComponent.getValue()),
				"g",
			);
			const count = (editor.getSelection().match(search) || []).length;

			const replacementText =
				count > 0
					? editor
							.getSelection()
							.replace(search, replaceWithInputComponent.getValue())
					: editor.getSelection();

			const selectionStart = editor.getCursor("from");

			editor.replaceSelection(replacementText);

			editor.setSelection(
				selectionStart,
				editor.offsetToPos(
					editor.posToOffset(selectionStart) + replacementText.length,
				),
			);
			this.close();
			new Notice(`Made ${count} replacements`);
		});

		contentEl.appendChild(submitButtonTarget);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
