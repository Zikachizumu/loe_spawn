# LOE (Legends of Empire) VPS Giriş Bilgileri

FiveM sunucusu, Ubuntu VPS, txAdmin ile yönetiliyor.

## SSH Bağlantısı
- Host/IP: 178.63.244.157
- Kullanıcı: root
- Port: 22 (varsayılan)
- Kimlik doğrulama: proje için ayrılmış ed25519 anahtar çifti
  - Private key (Windows, lokal): `~/.ssh/id_ed25519_loe`
  - Public key VPS'te `~/.ssh/authorized_keys` içine eklenmiş
- Bağlantı komutu:
  ```
  ssh -i ~/.ssh/id_ed25519_loe root@178.63.244.157
  ```

## Sunucu Dosya Yolları
- `server.cfg`: `/opt/fivem/txData/LegendsofEmpire_AC516C.base/server.cfg`
- Resources klasörü: `/opt/fivem/txData/LegendsofEmpire_AC516C.base/resources/` (kategori altında, örn. `[loe]/loe_hud`)
- Resource aktivasyonu: `server.cfg` içine `ensure <resource_adi>` satırı; restart txAdmin panelinden yapılır (kullanıcı ensure/restart işlemlerini kendisi txAdmin panelinden yapmayı tercih ediyor)
- systemd servis: `fivem.service`, loglar `journalctl` ile
- `luac5.4` VPS'e kurulu — canlıya almadan önce Lua syntax kontrolü için kullan (`luac5.4 -p <dosya>`)

## Git/GitHub Credential Saklama
- VPS'te `/root/.git-credentials` dosyasında `https://Zikachizumu:<PAT>@github.com` formatında saklanıyor (`git credential.helper store`)
- **Önemli:** gerçek token/parola değeri hiçbir zaman Claude tarafından görülmez/işlenmez/saklanmaz. Token değişmesi gerekirse kullanıcı kendi terminalinde ilgili komutu kendisi çalıştırır; doğrulama sadece maskeli okuma (`sed 's/:[^:@]*@/:***@/'`) veya `git push --dry-run` ile yapılır.

---
*Bu dosya `C:\Users\Luffy\.claude\` altında, proje/oturum bağımsız kalıcı bir konumda tutulur. Farklı bir proje klasöründeki hafıza sistemi bu dosyayı otomatik göremez — gerektiğinde bu dosyanın yolunu (`~/.claude/loe_vps_info.md`) ilgili sohbette belirtmen yeterli.*
