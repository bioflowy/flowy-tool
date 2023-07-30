package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
)

type Job struct {
	BaseDir string   `json:"basedir"`
	Command []string `json:"command"`
	Files   []File   `json:"files"`
}

type File struct {
	Class    string `json:"class"`
	Location string `json:"location"`
	Path     string `json:"path"`
}

func main() {
	// JSONファイルの読み込み
	jsonFile, err := os.Open("job.json")
	if err != nil {
		fmt.Println(err)
	}
	defer jsonFile.Close()

	byteValue, _ := ioutil.ReadAll(jsonFile)

	// JSONデータを構造体に変換
	var job Job
	json.Unmarshal(byteValue, &job)

	// BaseDirの存在確認と作成
	if _, err := os.Stat(job.BaseDir); os.IsNotExist(err) {
		os.MkdirAll(job.BaseDir, os.ModePerm)
	}

	// LocationからPathへのリンク作成
	for _, file := range job.Files {
		// ディレクトリが存在しない場合は作成
		dir := filepath.Dir(file.Path)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			os.MkdirAll(dir, os.ModePerm)
		}

		// シンボリックリンク作成
		os.Symlink(file.Location, file.Path)
	}

	// Commandの実行
	fmt.Println("Command: ", job.Command)
	cmd := exec.Command(job.Command[0], job.Command[1:]...)
	cmd.Dir = job.BaseDir
	cmd.Stderr = os.Stdout
	err = cmd.Run()
	if err != nil {
		fmt.Println("Command finished with error: ", err)
	}
}
