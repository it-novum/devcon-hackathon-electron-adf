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

import { Component, OnInit } from "@angular/core";
import { Location } from "@angular/common";
import { AuthenticationService } from "@alfresco/adf-core";
import { ActivatedRoute, Params } from "@angular/router";
import { Subject } from "rxjs";
import { WebcamImage } from "ngx-webcam";
import { Observable } from "rxjs";
import { ElectronService } from "ngx-electron";
import { Store } from "@ngrx/store";
import { FileModel } from "@alfresco/adf-core";
import { AppStore } from "../../store/states";
import { UploadService } from "@alfresco/adf-core";

@Component({
  templateUrl: "./login.component.html"
})
export class LoginComponent implements OnInit {
  private trigger: Subject<void> = new Subject<void>();
  public webcamImage: WebcamImage = null;
  constructor(
    private location: Location,
    private auth: AuthenticationService,
    private route: ActivatedRoute,
    private electronService: ElectronService,
    private uploadService: UploadService
  ) {}

  triggerSnapshot = () => {
    this.trigger.next();
  };
  public handleImage(webcamImage: WebcamImage): void {
    console.log("received webcam image", webcamImage);

    const imageBlob = this.dataURItoBlob(webcamImage.imageAsBase64);
    const webcamFile = new FileModel(
      new File([imageBlob], "webcam.jpeg", { type: "image/jpeg" }),
      {
        parentId: "-my-"
      }
    );
    console.log("Now dispatching", webcamFile);
    this.uploadService.addToQueue(webcamFile);
    this.uploadService.uploadFilesInTheQueue();

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

  ngOnInit() {
    this.electronService.ipcRenderer.on("takeImage", this.triggerSnapshot);
    if (this.auth.isEcmLoggedIn()) {
      this.location.forward();
    } else {
      this.route.queryParams.subscribe((params: Params) => {
        const redirectUrl = params["redirectUrl"];
        this.auth.setRedirect({ provider: "ECM", url: redirectUrl });
      });
    }
  }
  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }
}
