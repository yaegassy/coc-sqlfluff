# coc-sqlfluff

[SQLFluff](https://pypi.org/project/sqlfluff/) (A SQL linter and auto-formatter for Humans) extension for [coc.nvim](https://github.com/neoclide/coc.nvim)

<img width="780" alt="coc-sqlfluff-demo" src="https://user-images.githubusercontent.com/188642/117741969-a6bc3200-b23e-11eb-9481-83e6fe71ee3d.gif">

## Features

- Lint
- Format
- Code Action
- Built-in installer

## Install

**CocInstall**:

```vim
:CocInstall coc-sqlfluff
```

**vim-plug**:

```vim
Plug 'yaegassy/coc-sqlfluff', {'do': 'yarn install --frozen-lockfile'}
```

## Detect: sqlfluff

1. `sqlfluff.commandPath` setting
1. PATH environment (e.g. system global PATH or venv, etc ...)
1. builtin: extension-only "venv" (Installation commands are also provided)

## Bult-in install

coc-sqlfluff allows you to create an extension-only "venv" and install "sqlfluff".

The first time you use coc-sqlfluff, if sqlfluff is not detected, you will be prompted to do a built-in installation.

You can also run the installation command manually.

```vim
:CocCommand sqlfluff.install
```

## SQLFluff configuration file (setup.cfg, tox.ini, pep8.ini, .sqlfluff, pyproject.toml)

SQLFluff is able to read project-specific default values for its command line options, or from a configuration file.

SQLFluff will look for the following files in order. Later files will (if found) will be used to overwrite any vales read from earlier files.

1. `setup.cfg`
1. `tox.ini`
1. `pep8.ini`
1. `.sqlfluff`
1. `pyproject.toml`

**REF**:

- <https://docs.sqlfluff.com/en/stable/configuration.html>

## Configuration options

- `sqlfluff.enable`: Enable coc-sqlfluff extension, default: `true`
- `sqlfluff.commandPath`: The path to the sqlfluff command (Absolute path), default: `""`
- `sqlfluff.builtin.pythonPath`: Python 3.x path (Absolute path) to be used for built-in install, default: `""`
- `sqlfluff.lintOnOpen`: Lint file on opening, default: `true`
- `sqlfluff.lintOnChange`: Lint file on change, default: `true`
- `sqlfluff.lintOnSave`: Lint file on save, default: `true`
- `sqlfluff.formatEnable`: Whether the document formatter is enabled or not, default: `true`
- `sqlfluff.linter.ignoreParsing`: Whether the sql linter should ignore parsing errors, default: `true`

## Commands

- `sqlfluff.install`: Install sqlfluff
  - It will be installed in this path:
    - Mac/Linux: `~/.config/coc/extensions/coc-sqlfluff-data/sqlfluff/venv/bin/sqlfluff`
    - Windows: `~/AppData/Local/coc/extensions/coc-sqlfluff-data/sqlfluff/venv/Scripts/sqlfluff.exe`
- `sqlfluff.fix`: Run sqlfluff fix file
- `sqlfluff.showOutput`: Show sqlfluff output channel

## Code Actions

**Example key mapping (Code Action related)**:

```vim
nmap <silent> ga <Plug>(coc-codeaction-line)
```

**Usage**:

In the line with diagnostic message, enter the mapped key (e.g. `ga`) and you will see a list of code actions that can be performed.

**Actions**:

- `Ignoring Errors for current line (-- noqa)`
- `Ignoring Errors for current line (-- noqa: disable=all)`
- `Ignoring Errors for current line (-- noqa: enable=all)`

## Related coc.nvim extension

- [fannheyward/coc-sql](https://github.com/fannheyward/coc-sql) by Lint(node-sql-parser) and Format(sql-formatter)
- [kristijanhusak/vim-dadbod-completion](https://github.com/kristijanhusak/vim-dadbod-completion) | [coc-db](https://www.npmjs.com/package/coc-db)

## Thanks

- [sqlfluff/sqlfluff](https://github.com/sqlfluff/sqlfluff)

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
