/*!
 * @license
 * Alfresco Example Content Application
 *
 * Copyright (C) 2005 - 2018 Alfresco Software Limited
 *
 * This file is part of the Alfresco Example Content Application.
 * If the software was purchased under a paid Alfresco license, the terms of
 * the paid license agreement will prevail.  Otherwise, the software is
 * provided under the following open source license terms:
 *
 * The Alfresco Example Content Application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The Alfresco Example Content Application is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Alfresco. If not, see <http://www.gnu.org/licenses/>.
 */

import {
  AppConfigService,
  SidenavLayoutComponent,
  UserPreferencesService
} from "@alfresco/adf-core";
import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from "@angular/core";
import { NavigationEnd, Router, NavigationStart } from "@angular/router";
import { Store } from "@ngrx/store";
import { Subject, Observable } from "rxjs";
import { filter, takeUntil, map, withLatestFrom } from "rxjs/operators";
import { NodePermissionService } from "../../../services/node-permission.service";
import { currentFolder } from "../../../store/selectors/app.selectors";
import { AppStore } from "../../../store/states";
import { BreakpointObserver } from "@angular/cdk/layout";
import { SetSelectedNodesAction } from "../../../store/actions";
import { FileModel } from "@alfresco/adf-core";
import { WebcamImage } from "ngx-webcam";
import { UploadService } from "@alfresco/adf-core";
import { ElectronService } from "ngx-electron";

@Component({
  selector: "app-layout",
  templateUrl: "./app-layout.component.html",
  encapsulation: ViewEncapsulation.None,
  host: { class: "app-layout" }
})
export class AppLayoutComponent implements OnInit, OnDestroy {
  @ViewChild("layout")
  layout: SidenavLayoutComponent;

  onDestroy$: Subject<boolean> = new Subject<boolean>();
  isSmallScreen$: Observable<boolean>;

  expandedSidenav: boolean;
  currentFolderId: string;
  canUpload = false;

  minimizeSidenav = false;
  hideSidenav = false;

  private minimizeConditions: string[] = ["search"];
  private hideConditions: string[] = ["preview"];

  private trigger: Subject<void> = new Subject<void>();
  public webcamImage: WebcamImage = null;

  constructor(
    protected store: Store<AppStore>,
    private permission: NodePermissionService,
    private router: Router,
    private userPreferenceService: UserPreferencesService,
    private appConfigService: AppConfigService,
    private breakpointObserver: BreakpointObserver,
    private electronService: ElectronService,
    private uploadService: UploadService
  ) {}

  ngOnInit() {
    this.electronService.ipcRenderer.on("takeImage", this.triggerSnapshot);

    this.isSmallScreen$ = this.breakpointObserver
      .observe(["(max-width: 600px)"])
      .pipe(map(result => result.matches));

    this.hideSidenav = this.hideConditions.some(el =>
      this.router.routerState.snapshot.url.includes(el)
    );

    this.minimizeSidenav = this.minimizeConditions.some(el =>
      this.router.routerState.snapshot.url.includes(el)
    );

    if (!this.minimizeSidenav) {
      this.expandedSidenav = this.getSidenavState();
    } else {
      this.expandedSidenav = false;
    }

    this.store
      .select(currentFolder)
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(node => {
        this.currentFolderId = node ? node.id : null;
        this.canUpload = node && this.permission.check(node, ["create"]);
      });

    this.router.events
      .pipe(
        withLatestFrom(this.isSmallScreen$),
        filter(
          ([event, isSmallScreen]) =>
            isSmallScreen && event instanceof NavigationEnd
        ),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => {
        this.layout.container.sidenav.close();
      });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.onDestroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.minimizeSidenav = this.minimizeConditions.some(el =>
          event.urlAfterRedirects.includes(el)
        );
        this.hideSidenav = this.hideConditions.some(el =>
          event.urlAfterRedirects.includes(el)
        );

        this.updateState();
      });

    this.router.events
      .pipe(
        filter(event => {
          return (
            event instanceof NavigationStart &&
            // search employs reuse route strategy
            !event.url.startsWith("/search;")
          );
        }),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => this.store.dispatch(new SetSelectedNodesAction([])));
  }
  triggerSnapshot = () => {
    this.trigger.next();
  };
  public handleImage(webcamImage: WebcamImage): void {
    console.log("received webcam image", webcamImage);

    const imageBlob = this.dataURItoBlob(webcamImage.imageAsBase64);
    const webcamFile = new FileModel(
      new File([imageBlob], "webcam.jpeg", { type: "image/jpeg" }),
      {
        parentId: "8b1b6b09-4646-469d-9b18-46a988d6529f"
      }
    );
    this.uploadService.fileUploadProgress.subscribe(event => {
      this.electronService.ipcRenderer.send("uploadProgress", [
        { progress: event.file.progress.percent }
      ]);
    });

    this.uploadService.fileUploadComplete.subscribe(event => {
      console.log("## file uploaded", this.electronService);
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send("upload", [
          {
            name: event.data.entry.name
          }
        ]);
      }
    });
    this.uploadService.addToQueue(webcamFile);
    this.uploadService.uploadFilesInTheQueue();
  }
  dataURItoBlob(dataURI) {
    const byteString = atob(dataURI);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
    return blob;
  }
  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.complete();
  }

  private updateState() {
    if (this.minimizeSidenav && !this.layout.isMenuMinimized) {
      this.layout.isMenuMinimized = true;
      this.layout.container.toggleMenu();
    }

    if (!this.minimizeSidenav) {
      if (this.getSidenavState() && this.layout.isMenuMinimized) {
        this.layout.isMenuMinimized = false;
        this.layout.container.toggleMenu();
      }
    }
  }

  onExpanded(state) {
    if (
      !this.minimizeSidenav &&
      this.appConfigService.get("sideNav.preserveState")
    ) {
      this.userPreferenceService.set("expandedSidenav", state);
    }
  }

  private getSidenavState(): boolean {
    const expand = this.appConfigService.get<boolean>(
      "sideNav.expandedSidenav",
      true
    );
    const preserveState = this.appConfigService.get<boolean>(
      "sideNav.preserveState",
      true
    );

    if (preserveState) {
      return (
        this.userPreferenceService.get("expandedSidenav", expand.toString()) ===
        "true"
      );
    }

    return expand;
  }
  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }
}
