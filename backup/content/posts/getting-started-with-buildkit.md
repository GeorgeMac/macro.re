---
title: "Getting Started With BuildKit"
date: 2018-01-02T11:51:26Z
tags: ["buildkit", "docker", "go", "containers", "moby"]
---

The clever peepz over at Moby are clearly hard at work revolutionising the way we work with containers and images. I have recently been interested in the [BuildKit](github.com/moby/buildkit) project.

> BuildKit is a toolkit for converting source code to build artifacts in an efficient, expressive and repeatable manner. [buildkit](https://github.com/moby/buildkit#buildkit)

## What is BuildKit?

In a nutshell BuildKit is an engine which interprets a graph of instructions into a target container image format. With the ability to target multiple export formats (e.g. OCI or docker), support multiple frontends (e.g. Dockerfile) and provide all sorts of wonderful features such as efficient layer caching and operation parallelization.

BuildKit is separate from Docker and only requires a container runtime to facilitate the execution of operations to create image layers. The currently supported runtime's are `containerd` and plain old `runc`.

The BuildKit project itself consists of two key components. The first being the build daemon `buildkitd`. The second being a cli tool called `buildctl` which is used to facilitate command line communication with the `buildkitd` instance.

The BuildKit cli `buildctl` is configured to receive a graph based IR (intermediate representation) of operations. This IR is called `llb` which stands for `low-level builder`. This format is defined in the BuildKit project using protobuf. The `buildctl` command itself expects an `llb` to be marshalled in this format on STDIN. Currently there are some handy Go libraries for describing and marshalling an `llb` to an `io.Writer`. However, since the format is protobuf it will be really easy to port `llb` generating code to other languages. As a die hard gopher myself though, I am fortunate enough to be able to start hacking on this right away.

It is the `llb` medium which facilitates BuildKit's ability to have multiple frontends. There currently exists an experimental frontend for `Dockerfile`. I believe the intent of this project is to replace the current docker builder baked into the `docker` command.

The BuildKit Github project contains an `examples` folder with lots of Go binaries which spit protobuf encoded `llb` instructions which can be piped into `buildctl`, examined and then executed. I am going to walk through how this can be achieved on a mac.

## Walkthrough

To start with here is my setup:

    # Mac OSX Version 10.11.6 (15G1004)

    go version
    > go version go1.9 darwin/amd64

    # Docker For Mac Version 17.12.0-ce-rc4-mac44 (21438)
    docker version
    > Client:
    >  Version:	17.12.0-ce-rc4
    >  API version:	1.35
    >  Go version:	go1.9.2
    >  Git commit:	6a2c058
    >  Built:	Wed Dec 20 15:53:52 2017
    >  OS/Arch:	darwin/amd64
    > Server:
    >  Engine:
    >   Version:	17.12.0-ce-rc4
    >   API version:	1.35 (minimum version 1.12)
    >   Go version:	go1.9.2
    >   Git commit:	6a2c058
    >   Built:	Wed Dec 20 15:59:49 2017
    >   OS/Arch:	linux/amd64
    >   Experimental:	true

    make --version
    > GNU Make 3.81
    > Copyright (C) 2006  Free Software Foundation, Inc.
    > This is free software; see the source for copying conditions.
    > There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A
    > PARTICULAR PURPOSE.
    > This program built for i386-apple-darwin11.3.0

    jq --version
    > jq-1.5

Step one is to fetch the `buildkit` project itself. I am going to be building it from source for this walkthrough.

    go get github.com/moby/buildkit

Step two is to get into the BuildKit project itself, so that we can build it and play with the examples.

    cd $GOPATH/src/github.com/moby/buildkit

Step three is to build the `buildctl` tool I described earlier. For this walkthrough I will not be building the daemon for mac, but instead I will run the daemon as a docker container in a later step.
This `make` command will build a target binary into the local `./bin` directory, which is why we will refer to the binary as `./bin/buildctl-darwin` from here on out.

    make bin/buildctl-darwin

Next we will run `buildkitd` as a container. For this we can fetch [tonistiigi](github.com/tonistiigi)'s handy image, run it as a privileged container and expose its `1234` port on the host.
This has been taken directly from the [Buildkit README](https://github.com/moby/buildkit#running-containerized-buildkit).

    docker run -d --privileged -p 1234:1234 tonistiigi/buildkit --addr tcp://0.0.0.0:1234

    export BUILDKIT_HOST=tcp://0.0.0.0:1234

    buildctl build --help

Now we can start playing with BuildKit. For the purpose of this walkthrough, we will use `examples/buildkit0`. The aim of this example is to build `buildkit` itself along with `runc` and `containerd`.
To help us understand this, we are going to use the `buildctl debug dump-llb` command to convert the `llb` protobuf into a more readable JSON array of layer operations. Then we will pipe the JSON through `jq` to prettify.

    go run examples/buildkit0/buildkit.go | ./bin/buildctl-darwin debug dump-llb | jq '.'

Here is a snippet of the JSON output from `dump-llb`:

```json
//...
{
  "Op": {
    "inputs": [
      {
        "digest": "sha256:6c494995583024a1d0aa139a485de80e0fc08420db8f3fff743d7c8661db2038",
        "index": 1
      }
    ],
    "Op": {
      "Exec": {
        "meta": {
          "args": [
            "ls",
            "-l",
            "/bin"
          ],
          "env": [
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
          ],
          "cwd": "/"
        },
        "mounts": [
          {
            "input": 0,
            "dest": "/",
            "output": 0
          }
        ]
      }
    }
  },
  "Digest": "sha256:9a5e639ad73c2329313a7809e60f57a2bd4cfff20e6094dd8ad8d42f69cae397",
  "OpMetadata": {}
}
//...
```

This is the penultimate operation in the sequence. Looking at the generating code itself in `examples/buildkit0/buildkit.go` you will find the above operation is created by the line:

    out := bk.Run(llb.Shlex("ls -l /bin")) // debug output


Now lets build this example!

    go run examples/buildkit0/buildkit.go | ./bin/buildctl-darwin build

    INFO[0000] tracing logs to /var/folders/9k/c2skyh6565q8005str8r1b9w0000gn/T/buildctl453683322
    [+] Building 59.3s (19/19) FINISHED
     => CACHED docker-image://docker.io/library/golang:1.9-alpine                                                       0.0s
     => => resolve docker.io/library/golang:1.9-alpine                                                                  0.5s
     => apk add --no-cache g++ linux-headers                                                                           11.1s
     => CACHED docker-image://docker.io/library/alpine:latest                                                           0.0s
     => => resolve docker.io/library/alpine:latest                                                                      1.8s
     => apk add --no-cache git make                                                                                     3.5s
     => git clone https://github.com/opencontainers/runc.git /go/src/github.com/opencontainers/runc                     3.3s
     => git clone https://github.com/moby/buildkit.git /go/src/github.com/moby/buildkit                                18.3s
     => apk add --no-cache btrfs-progs-dev                                                                              5.8s
     => git checkout -q 74a17296470088de3805e138d3d87c62e613dfc4                                                        0.4s
     => go build -o /usr/bin/runc ./                                                                                    3.4s
     => git clone https://github.com/containerd/containerd.git /go/src/github.com/containerd/containerd                12.5s
     => git checkout -q v1.0.0                                                                                          0.6s
     => go build -o /bin/buildctl ./cmd/buildctl                                                                       11.7s
     => go build -o /bin/buildkitd ./cmd/buildkitd                                                                     19.7s
     => make bin/containerd                                                                                            24.7s
     => cp -a /src/bin/buildctl /dest/bin/                                                                              0.4s
     => cp -a /src/usr/bin/runc /dest/bin/                                                                              0.5s
     => cp -a /src/go/src/github.com/containerd/containerd/bin/containerd /dest/bin/                                    0.4s
     => cp -a /src/bin/buildkitd /dest/bin/                                                                             0.4s
     => ls -l /bin                                                                                                      0.4s

You should see some nice interactive output, similar to what is pasted above. However, you may be thinking at this point; where is this image? It is actually currently only inside the `buildkitd` build cache. So lets take a look at the cache.

    ./bin/buildctl-darwin du

    ID									            RECLAIMABLE	SIZE		LAST ACCESSED
    sha256:e67ac2c9401cbc0394d10                    true		348.83MB
    omrrlstueubebyt7ecbw6gwrf						true		151.84MB
    mxido1mek1s7o3bbrkjecgtxp						true		151.84MB
    # ... truncated

Now to get these layers into something tangible you will need to use an exporter. To do so, use the `--exporter` flag on the build call. Thanks to the build cache the subsequent calls will be super quick.

    go run examples/buildkit0/buildkit.go | ./bin/buildctl-darwin build --exporter=docker --exporter-opt name=buildkit0 | docker load

For this example I have used the `docker` exporter which spits out the tarball of the image on STDOUT, which is suitable for piping into `docker load`. The output of this command looks something like this:

```bash
INFO[0000] tracing logs to /var/folders/9k/c2skyh6565q8005str8r1b9w0000gn/T/buildctl725843021
[+] Building 2.6s (20/20) FINISHED
 => CACHED docker-image://docker.io/library/alpine:latest                                                   0.0s
 => => resolve docker.io/library/alpine:latest                                                              1.9s
 => CACHED docker-image://docker.io/library/golang:1.9-alpine                                               0.0s
 => => resolve docker.io/library/golang:1.9-alpine                                                          1.9s
 => CACHED apk add --no-cache g++ linux-headers                                                             0.0s
 => CACHED apk add --no-cache git make                                                                      0.0s
 => CACHED git clone https://github.com/moby/buildkit.git /go/src/github.com/moby/buildkit                  0.0s
 => CACHED go build -o /bin/buildctl ./cmd/buildctl                                                         0.0s
 => CACHED cp -a /src/bin/buildctl /dest/bin/                                                               0.0s
 => CACHED git clone https://github.com/opencontainers/runc.git /go/src/github.com/opencontainers/runc      0.0s
 => CACHED git checkout -q 74a17296470088de3805e138d3d87c62e613dfc4                                         0.0s
 => CACHED go build -o /usr/bin/runc ./                                                                     0.0s
 => CACHED cp -a /src/usr/bin/runc /dest/bin/                                                               0.0s
 => CACHED apk add --no-cache btrfs-progs-dev                                                               0.0s
 => CACHED git clone https://github.com/containerd/containerd.git /go/src/github.com/containerd/containerd  0.0s
 => CACHED git checkout -q v1.0.0                                                                           0.0s
 => CACHED make bin/containerd                                                                              0.0s
 => CACHED cp -a /src/go/src/github.com/containerd/containerd/bin/containerd /dest/bin/                     0.0s
 => CACHED go build -o /bin/buildkitd ./cmd/buildkitd                                                       0.0s
 => CACHED cp -a /src/bin/buildkitd /dest/bin/                                                              0.0s
 => CACHED ls -l /bin                                                                                       0.0s
 => exporting to oci image format                                                                           2.6s
 => => exporting layers                                                                                     2.1s
 => => exporting config sha256:efa327e9aeeadffdc162168b0c0b40990eeb577a1002ef1484de51dd6cdde7f4             0.0s
 => => exporting manifest sha256:6793e4492fd46b94cf80405cabacd8f15e0e936a311a24219ccefce49329250e           0.0s
 => => sending tarball                                                                                      0.5s
4557c2a02b80: Loading layer [==================================================>]  4.922MB/4.922MB
12fd2a20e004: Loading layer [==================================================>]  2.848MB/2.848MB
8855e1274f0c: Loading layer [==================================================>]  6.725MB/6.725MB
57a8e2e4ca07: Loading layer [==================================================>]  9.422MB/9.422MB
e14e118cf849: Loading layer [==================================================>]     108B/108B
Loaded image: buildkit0:latest
```

The majority of the time spent was exporting the image thanks to the build cache. There is even a handy output to show the cache hits, much like `docker build`.

Now to be certain it all worked as expected, check your docker instance's image database.

    docker image ls

    REPOSITORY   TAG     IMAGE ID      CREATED        SIZE
    ...
    buildkit0    latest  efa327e9aeea  292 years ago  86.7MB

You may be a little concerned how the image got created 292 years ago. However, you will find that this is the product the date pretty-printer being supplied with the epoch.
It appears that at the time of writing this blog post, the docker exporter doesn't set the `created_at` metadata on the docker image format.

If this project interests you, I would recommend you start hacking on it.
