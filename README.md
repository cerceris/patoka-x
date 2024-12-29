#### Prerequisites
Use environment (e.g. container) defined in the Dockerfile `patoka/docker/`.
This directory is PATOKA_X_DIR.
```
export PATOKA_X_DIR=`pwd`
```

#### Install patoka-x
```
cd $PATOKA_X_DIR
./do_build
```

#### To use `patoka-x` in projects:
Execute in the project's folder.
```
npm link $PATOKA_X_DIR
```
