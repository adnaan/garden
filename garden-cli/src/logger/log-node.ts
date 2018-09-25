/*
 * Copyright (C) 2018 Garden Technologies, Inc. <info@garden.io>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as uniqid from "uniqid"
import { round } from "lodash"

import { findLogNode } from "./util"
import { LogEntry, CreateParam } from "./log-entry"

export enum LogLevel {
  error = 0,
  warn = 1,
  info = 2,
  verbose = 3,
  debug = 4,
  silly = 5,
}

export abstract class LogNode<T = LogEntry, U = CreateParam> {
  public readonly timestamp: number
  public readonly key: string
  public readonly children: T[]
  public readonly root: RootLogNode<T>

  constructor(
    public readonly level: LogLevel,
    public readonly parent?: LogNode<T, U>,
    public readonly id?: string,
  ) {
    if (this instanceof RootLogNode) {
      this.root = this
    } else {
      // Non-root nodes have a parent
      this.root = parent!.root
    }
    this.key = uniqid()
    this.timestamp = Date.now()
    this.children = []
  }

  abstract createNode(level: LogLevel, parent: LogNode<T, U>, param?: U): T

  protected addNode(level: LogLevel, param?: U): T {
    const node = this.createNode(level, this, param)
    this.children.push(node)
    this.root.onGraphChange(node)
    return node
  }

  protected addEmptyNode(): T {
    return this.addNode(LogLevel.info)
  }

  silly(param?: U): T {
    return this.addNode(LogLevel.silly, param)
  }

  debug(param?: U): T {
    return this.addNode(LogLevel.debug, param)
  }

  verbose(param?: U): T {
    return this.addNode(LogLevel.verbose, param)
  }

  info(param?: U): T {
    return this.addNode(LogLevel.info, param)
  }

  warn(param?: U): T {
    return this.addNode(LogLevel.warn, param)
  }

  error(param?: U): T {
    return this.addNode(LogLevel.error, param)
  }

  /**
   * Returns the duration in seconds, defaults to 2 decimal precision
   */
  getDuration(precision: number = 2): number {
    return round((Date.now() - this.timestamp) / 1000, precision)
  }

}

export abstract class RootLogNode<T = LogEntry> extends LogNode<T> {
  abstract onGraphChange(node: T): void

  findById(id: string): T | void {
    return findLogNode(this, node => node.id === id)
  }

}
