package com.localimage.editor;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.Arrays;
import javax.imageio.ImageIO;

public final class ToneMathTest {
    private static int passed = 0;
    private static void test(String name, Runnable check) {
        check.run(); passed++; System.out.println("PASS " + name);
    }
    private static void equal(int actual, int expected) {
        if (actual != expected) throw new AssertionError("expected " + expected + ", got " + actual);
    }
    private static void truth(boolean condition) { if (!condition) throw new AssertionError(); }
    private static int gray(int n) { return 0xff000000 | n << 16 | n << 8 | n; }
    public static void main(String[] args) throws Exception {
        test("transparent black composites to white", () -> equal(ToneMath.luminanceOnWhite(0x00000000), 255));
        test("half-transparent black does not create black fringes", () -> equal(ToneMath.luminanceOnWhite(0x80000000), 127));
        test("luminance weights preserve color distinctions", () -> {
            equal(ToneMath.luminanceOnWhite(0xffff0000), 54);
            equal(ToneMath.luminanceOnWhite(0xff00ff00), 182);
            equal(ToneMath.luminanceOnWhite(0xff0000ff), 18);
        });
        test("neutral curve is identity for every gray", () -> {
            int[] lut = ToneMath.lookup(0, 0, 0, 0, 0, 255);
            for (int i = 0; i < 256; i++) equal(lut[i], i);
        });
        test("brightness lifts and darkens midtones without changing endpoints", () -> {
            int[] lighter = ToneMath.lookup(2, 0, 0, 0, 0, 255), darker = ToneMath.lookup(-2, 0, 0, 0, 0, 255);
            truth(lighter[64] > 64); truth(darker[192] < 192);
            equal(lighter[0], 0); equal(darker[255], 255);
        });
        test("contrast curve separates midtones", () -> {
            int[] lut = ToneMath.lookup(0, 3, 0, 0, 0, 255);
            truth(lut[80] < 80); truth(lut[180] > 180); equal(lut[0], 0); equal(lut[255], 255);
        });
        test("shadow recovery favors dark midtones", () -> {
            int[] lut = ToneMath.lookup(0, 0, 4, 0, 0, 255);
            truth(lut[64] > 64); truth(lut[64] - 64 > lut[224] - 224);
        });
        test("highlight recovery favors bright midtones", () -> {
            int[] lut = ToneMath.lookup(0, 0, 0, 4, 0, 255);
            truth(lut[192] < 192); truth(192 - lut[192] > 32 - lut[32]);
        });
        test("all 2025 control combinations remain monotonic and in range", () -> {
            for (int b = -4; b <= 4; b++) for (int c = -4; c <= 4; c++)
                for (int s = 0; s <= 4; s++) for (int h = 0; h <= 4; h++) {
                    int[] lut = ToneMath.lookup(b, c, s, h, 0, 255);
                    for (int i = 1; i < 256; i++) truth(lut[i] >= lut[i - 1] && lut[i] <= 255);
                }
        });
        test("auto levels ignore sparse black-white outliers", () -> {
            int[] hist = new int[256]; hist[0] = 2; hist[255] = 2; hist[70] = 500; hist[180] = 500;
            truth(Arrays.equals(ToneMath.automaticLevels(hist), new int[]{70, 180}));
        });
        test("flat image does not amplify scan noise", () -> {
            int[] hist = new int[256]; hist[210] = 500; hist[215] = 500;
            truth(Arrays.equals(ToneMath.automaticLevels(hist), new int[]{0, 255}));
        });
        test("crop rounds outward and preserves at least one pixel", () -> {
            truth(Arrays.equals(ToneMath.cropPixels(101, 53, .1, .2, .9, .8), new int[]{10, 10, 81, 33}));
            truth(Arrays.equals(ToneMath.cropPixels(1, 1, 0, 0, 1, 1), new int[]{0, 0, 1, 1}));
        });
        test("invalid crop is rejected", () -> {
            for (double[] r : new double[][]{{0, 0, 0, 1}, {-1, 0, 1, 1}, {0, 0, 2, 1}, {Double.NaN, 0, 1, 1}}) {
                boolean threw = false;
                try {ToneMath.cropPixels(100, 100, r[0], r[1], r[2], r[3]);} catch (IllegalArgumentException e) {threw = true;}
                truth(threw);
            }
        });
        test("all 8 EXIF orientations map the asymmetric test grid correctly", () -> {
            int[][] expected = {{0,1,2,3,4,5}, {2,1,0,5,4,3}, {5,4,3,2,1,0}, {3,4,5,0,1,2},
                {0,3,1,4,2,5}, {3,0,4,1,5,2}, {5,2,4,1,3,0}, {2,5,1,4,0,3}};
            for (int o = 1; o <= 8; o++) {
                int w = o >= 5 ? 2 : 3, h = o >= 5 ? 3 : 2;
                for (int y = 0; y < h; y++) for (int x = 0; x < w; x++)
                    equal(ToneMath.sourceIndex(x, y, 3, 2, o), expected[o - 1][y * w + x]);
            }
        });
        test("crop after orientation selects the displayed corner", () -> {
            int[] source = {gray(10), gray(20), gray(30), gray(40), gray(50), gray(60)};
            int[] out = ToneMath.resample(source, 3, 2, 6, new int[]{0,0,1,2}, 1, 2);
            equal(out[0] & 255, 40); equal(out[1] & 255, 50);
        });
        test("bilinear downsample averages a two-pixel pair", () -> {
            int[] out = ToneMath.resample(new int[]{gray(0), gray(255)}, 2, 1, 1, new int[]{0,0,2,1}, 1, 1);
            equal(out[0] & 255, 128);
        });
        test("output is opaque grayscale and histogram counts every pixel", () -> {
            int[] pixels = {0x00000000, gray(0), 0xffff0000, gray(128)};
            int[] hist = ToneMath.apply(pixels, ToneMath.lookup(0, 0, 0, 0, 0, 255));
            equal(Arrays.stream(hist).sum(), 4); equal(hist[255], 1); equal(hist[0], 1);
            for (int pixel : pixels) {equal(pixel >>> 24, 255); equal((pixel >>> 16) & 255, pixel & 255);}
        });
        test("invalid tone parameters are rejected", () -> {
            boolean threw = false;
            try {ToneMath.lookup(9, 0, 0, 0, 0, 255);} catch (IllegalArgumentException e) {threw = true;}
            truth(threw);
        });
        test("white masking changes only pure white and remains opaque", () -> {
            int[] pixels = new int[256];
            for (int i = 0; i < 256; i++) pixels[i] = gray(i);
            int[] hist = ToneMath.apply(pixels, ToneMath.lookup(0,0,0,0,0,255), true);
            for (int i = 0; i < 255; i++) equal(pixels[i], gray(i));
            equal(pixels[255], gray(254)); equal(hist[255], 0); equal(hist[254], 2);
            equal(Arrays.stream(hist).sum(), 256);
        });
        test("white masking happens after tone clips highlights to white", () -> {
            int[] pixels = {gray(220), gray(255), 0x00000000};
            ToneMath.apply(pixels, ToneMath.lookup(0,0,0,0,20,200), true);
            for (int pixel : pixels) equal(pixel, gray(254));
        });
        test("default output still preserves pure white", () -> {
            int[] pixels = {gray(255)};
            ToneMath.apply(pixels, ToneMath.lookup(0,0,0,0,0,255), false);
            equal(pixels[0], gray(255));
        });
        writeComparison(new File(args[0], "tone-comparison.png"));
        System.out.println("Native pixel engine: " + passed + " tests passed; comparison image generated.");
    }

    private static void writeComparison(File file) throws Exception {
        BufferedImage result = new BufferedImage(1000, 800, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = result.createGraphics(); g.setColor(Color.WHITE); g.fillRect(0,0,1000,800);
        g.setFont(new Font("SansSerif", Font.PLAIN, 22)); g.setColor(Color.BLACK);
        g.drawString("Original grayscale", 40, 35); g.drawString("Processed (same pixel engine)", 525, 35);
        double[][] values = {{2,0,2,0}, {-2,0,0,2}, {0,3,0,0}};
        String[] labels = {"Dark image / lift shadows", "Bright image / lower highlights", "Faint linework / contrast + levels"};
        for (int row = 0; row < 3; row++) {
            int[] pixels = new int[440 * 190];
            for (int y = 0; y < 190; y++) for (int x = 0; x < 440; x++) {
                int gray = row == 0 ? 10 + x * 90 / 439 : row == 1 ? 155 + x * 95 / 439 : 190 + x * 50 / 439;
                if ((x / 30 + y / 30) % 2 == 0) gray -= row == 2 ? 13 : 6;
                pixels[y * 440 + x] = gray(Math.max(0, gray));
            }
            BufferedImage before = new BufferedImage(440,190,BufferedImage.TYPE_INT_RGB);
            before.setRGB(0,0,440,190,pixels,0,440);
            int[] levels = row == 2 ? ToneMath.automaticLevels(ToneMath.histogram(pixels)) : new int[]{0,255};
            ToneMath.apply(pixels, ToneMath.lookup(values[row][0], values[row][1], values[row][2], values[row][3], levels[0], levels[1]));
            BufferedImage after = new BufferedImage(440,190,BufferedImage.TYPE_INT_RGB); after.setRGB(0,0,440,190,pixels,0,440);
            g.setColor(Color.BLACK); g.drawString(labels[row],40,75 + row * 245);
            g.drawImage(before,40,90 + row * 245,null); g.drawImage(after,520,90 + row * 245,null);
        }
        g.dispose(); ImageIO.write(result, "png", file);
    }
}
