package de.herber_edevelopment.m3uiptv;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.ViewGroup;
import android.widget.*;

import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.io.File;
import java.util.*;

public class FileExplorerActivity extends Activity {

    private RecyclerView recyclerView;
    private FileAdapter adapter;
    private String currentPath = "/";
    private TextView pathText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        pathText = new TextView(this);
        root.addView(pathText);

        recyclerView = new RecyclerView(this);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new FileAdapter();
        recyclerView.setAdapter(adapter);
        root.addView(recyclerView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        setContentView(root);

        loadDirectory(currentPath);
    }

    private void loadDirectory(String path) {
        currentPath = path;
        pathText.setText(path);
        List<FileItem> items = new ArrayList<>();

        if (path.equals("/")) {
            File ext = Environment.getExternalStorageDirectory();
            items.add(new FileItem("Internal Storage", ext.getAbsolutePath(), ext.length(), true));
            try {
                File[] dirs = getExternalFilesDirs(null);
                for (int i = 0; i < dirs.length; i++) {
                    items.add(new FileItem("External " + (i + 1), dirs[i].getAbsolutePath(), dirs[i].length(), true));
                }
            } catch (Exception ignored) {}
        } else {
            File dir = new File(path);
            if (dir.canRead() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    Arrays.sort(files, (a, b) -> {
                        if (a.isDirectory() && !b.isDirectory()) return -1;
                        if (!a.isDirectory() && b.isDirectory()) return 1;
                        return a.getName().compareToIgnoreCase(b.getName());
                    });
                    for (File f : files) {
                        items.add(new FileItem(f.getName(), f.getAbsolutePath(), f.length(), f.isDirectory()));
                    }
                }
                if (dir.getParent() != null) {
                    items.add(0, new FileItem("..", dir.getParent(), 0, true));
                }
            }
        }
        adapter.setItems(items);
    }

    private void onItemClicked(FileItem item) {
        if (item.isDirectory) {
            loadDirectory(item.path);
        } else {
            Intent result = new Intent();
            result.putExtra("selectedFilePath", item.path);
            setResult(RESULT_OK, result);
            finish();
        }
    }

    // ---------- inner classes ----------
    static class FileItem {
        String name, path;
        long size;
        boolean isDirectory;
        FileItem(String n, String p, long s, boolean d) {
            name = n; path = p; size = s; isDirectory = d;
        }
    }

    class FileAdapter extends RecyclerView.Adapter<FileAdapter.VH> {
        List<FileItem> items = new ArrayList<>();

        void setItems(List<FileItem> items) {
            this.items = items;
            notifyDataSetChanged();
        }

        @Override
        public VH onCreateViewHolder(ViewGroup parent, int viewType) {
            TextView tv = new TextView(parent.getContext());
            tv.setPadding(20, 20, 20, 20);
            tv.setTextSize(16);
            return new VH(tv);
        }

        @Override
        public void onBindViewHolder(VH holder, int position) {
            FileItem item = items.get(position);
            holder.textView.setText(item.name);
            holder.textView.setOnClickListener(v -> onItemClicked(item));
        }

        @Override
        public int getItemCount() { return items.size(); }

        class VH extends RecyclerView.ViewHolder {
            TextView textView;
            VH(View itemView) {
                super(itemView);
                textView = (TextView) itemView;
            }
        }
    }
}