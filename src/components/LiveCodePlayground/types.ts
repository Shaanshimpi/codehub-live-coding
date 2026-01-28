// Types for LiveCodePlayground component

export interface Language {
  id: string
  name: string
  monacoLanguage: string
  extension: string
  defaultCode: string
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  status: 'success' | 'runtime_error' | 'compilation_error' | 'timeout' | 'error'
  executionTime?: number
  memory?: number
  exitCode?: number
}

export interface LiveCodePlaygroundProps {
  language: string
  code: string
  onChange: (code: string) => void
  onRun: (code: string, input?: string) => void | Promise<void>
  readOnly?: boolean
  showAIHelper?: boolean
  onAIRequest?: () => void
  executing?: boolean
  executionResult?: ExecutionResult | null
  onStopExecution?: () => void
  height?: string | number
  theme?: 'vs-dark' | 'light'
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoLanguage: 'javascript',
    extension: '.js',
    defaultCode: '// Write your JavaScript code here\nconsole.log("Hello, World!");',
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    monacoLanguage: 'javascript',
    extension: '.js',
    defaultCode: '// Write your Node.js code here\nconsole.log("Hello from Node.js!");',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    extension: '.ts',
    defaultCode: '// Write your TypeScript code here\nconst message: string = "Hello, TypeScript!";\nconsole.log(message);',
  },
  {
    id: 'python',
    name: 'Python',
    monacoLanguage: 'python',
    extension: '.py',
    defaultCode: '# Write your Python code here\nprint("Hello, World!")',
  },
  {
    id: 'python2',
    name: 'Python 2',
    monacoLanguage: 'python',
    extension: '.py',
    defaultCode: '# Write your Python 2 code here\nprint "Hello, World!"',
  },
  {
    id: 'c',
    name: 'C',
    monacoLanguage: 'c',
    extension: '.c',
    defaultCode: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLanguage: 'cpp',
    extension: '.cpp',
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  },
  {
    id: 'java',
    name: 'Java',
    monacoLanguage: 'java',
    extension: '.java',
    defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  },
  {
    id: 'csharp',
    name: 'C#',
    monacoLanguage: 'csharp',
    extension: '.cs',
    defaultCode: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}`,
  },
  {
    id: 'php',
    name: 'PHP',
    monacoLanguage: 'php',
    extension: '.php',
    defaultCode: '<?php\necho "Hello, World!";\n?>',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    monacoLanguage: 'ruby',
    extension: '.rb',
    defaultCode: '# Write your Ruby code here\nputs "Hello, World!"',
  },
  {
    id: 'go',
    name: 'Go',
    monacoLanguage: 'go',
    extension: '.go',
    defaultCode: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoLanguage: 'rust',
    extension: '.rs',
    defaultCode: 'fn main() {\n    println!("Hello, World!");\n}',
  },
  {
    id: 'kotlin',
    name: 'Kotlin',
    monacoLanguage: 'kotlin',
    extension: '.kt',
    defaultCode: 'fun main() {\n    println("Hello, World!")\n}',
  },
  {
    id: 'swift',
    name: 'Swift',
    monacoLanguage: 'swift',
    extension: '.swift',
    defaultCode: 'import Swift\n\nprint("Hello, World!")',
  },
  {
    id: 'scala',
    name: 'Scala',
    monacoLanguage: 'scala',
    extension: '.scala',
    defaultCode: 'object Main extends App {\n  println("Hello, World!")\n}',
  },
  {
    id: 'perl',
    name: 'Perl',
    monacoLanguage: 'perl',
    extension: '.pl',
    defaultCode: '#!/usr/bin/perl\nprint "Hello, World!\\n";',
  },
  {
    id: 'r',
    name: 'R',
    monacoLanguage: 'r',
    extension: '.r',
    defaultCode: '# Write your R code here\nprint("Hello, World!")',
  },
  {
    id: 'dart',
    name: 'Dart',
    monacoLanguage: 'dart',
    extension: '.dart',
    defaultCode: 'void main() {\n  print("Hello, World!");\n}',
  },
  {
    id: 'lua',
    name: 'Lua',
    monacoLanguage: 'lua',
    extension: '.lua',
    defaultCode: '-- Write your Lua code here\nprint("Hello, World!")',
  },
  {
    id: 'bash',
    name: 'Bash',
    monacoLanguage: 'shell',
    extension: '.sh',
    defaultCode: '#!/bin/bash\necho "Hello, World!"',
  },
  {
    id: 'shell',
    name: 'Shell',
    monacoLanguage: 'shell',
    extension: '.sh',
    defaultCode: '#!/bin/sh\necho "Hello, World!"',
  },
  {
    id: 'haskell',
    name: 'Haskell',
    monacoLanguage: 'haskell',
    extension: '.hs',
    defaultCode: 'main :: IO ()\nmain = putStrLn "Hello, World!"',
  },
  {
    id: 'elixir',
    name: 'Elixir',
    monacoLanguage: 'elixir',
    extension: '.ex',
    defaultCode: 'IO.puts "Hello, World!"',
  },
  {
    id: 'erlang',
    name: 'Erlang',
    monacoLanguage: 'erlang',
    extension: '.erl',
    defaultCode: '-module(main).\n-export([start/0]).\n\nstart() ->\n    io:fwrite("Hello, World!\\n").',
  },
  {
    id: 'clojure',
    name: 'Clojure',
    monacoLanguage: 'clojure',
    extension: '.clj',
    defaultCode: '(println "Hello, World!")',
  },
  {
    id: 'groovy',
    name: 'Groovy',
    monacoLanguage: 'groovy',
    extension: '.groovy',
    defaultCode: 'println "Hello, World!"',
  },
  {
    id: 'objectivec',
    name: 'Objective-C',
    monacoLanguage: 'objective-c',
    extension: '.m',
    defaultCode: '#import <Foundation/Foundation.h>\n\nint main() {\n    NSLog(@"Hello, World!");\n    return 0;\n}',
  },
  {
    id: 'fsharp',
    name: 'F#',
    monacoLanguage: 'fsharp',
    extension: '.fs',
    defaultCode: 'printfn "Hello, World!"',
  },
  {
    id: 'assembly',
    name: 'Assembly',
    monacoLanguage: 'asm',
    extension: '.asm',
    defaultCode: '; Assembly code\nsection .data\n    msg db "Hello, World!", 0xa\n\nsection .text\n    global _start\n\n_start:\n    mov rax, 1\n    mov rdi, 1\n    mov rsi, msg\n    mov rdx, 14\n    syscall\n    mov rax, 60\n    xor rdi, rdi\n    syscall',
  },
  {
    id: 'fortran',
    name: 'Fortran',
    monacoLanguage: 'fortran',
    extension: '.f90',
    defaultCode: 'program hello\n    print *, "Hello, World!"\nend program hello',
  },
  {
    id: 'cobol',
    name: 'COBOL',
    monacoLanguage: 'cobol',
    extension: '.cob',
    defaultCode: 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n    DISPLAY "Hello, World!".\n    STOP RUN.',
  },
  {
    id: 'pascal',
    name: 'Pascal',
    monacoLanguage: 'pascal',
    extension: '.pas',
    defaultCode: 'program Hello;\nbegin\n  writeln(\'Hello, World!\');\nend.',
  },
]

