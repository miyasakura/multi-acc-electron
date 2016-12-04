# 動かしかた

```
npm install -g electron-prebuilt
```

でelectron-prebuiltを導入した上で、

```
electron .
```

で実行できます。

# パッケージ化をする

`electron-packager`を使います。

```
npm install -g electron-packager
```

を導入した上で、

```
electron-packager . MultiAcc --platform=darwin --arch=x64 --version=1.4.10 --icon=icon.icns
```

でビルドしてください。(platformは環境に合わせて指定してください)
